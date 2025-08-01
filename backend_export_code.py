# Add this to your app.py on Vast.ai instance

import subprocess
import json
import os
import tempfile
import uuid
import threading
from datetime import datetime
import pandas as pd
import re

# Global dictionary to track export jobs
export_jobs = {}

@app.route('/api/video/export', methods=['POST'])
def export_video():
    try:
        data = request.json
        segments = data.get('segments', [])
        export_settings = data.get('export_settings', {})
        original_filename = data.get('original_filename', 'video')
        input_video_path = data.get('input_video_path')
        
        if not segments:
            return jsonify({'success': False, 'error': 'No segments provided'}), 400
            
        if not input_video_path or not os.path.exists(input_video_path):
            return jsonify({'success': False, 'error': 'Original video not found'}), 400
            
        # Create unique job ID
        job_id = str(uuid.uuid4())
        
        # Initialize job status
        export_jobs[job_id] = {
            'status': 'started',
            'progress': 0,
            'message': 'Initializing export...',
            'created_at': datetime.now(),
            'output_file': None,
            'error': None
        }
        
        # Start export in background thread
        export_thread = threading.Thread(
            target=process_video_export_background,
            args=(job_id, input_video_path, segments, export_settings)
        )
        export_thread.daemon = True
        export_thread.start()
        
        return jsonify({
            'success': True,
            'job_id': job_id,
            'message': 'Export started',
            'estimated_duration': len(segments) * 2
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/video/export/status/<job_id>', methods=['GET'])
def get_export_status(job_id):
    if job_id not in export_jobs:
        return jsonify({'success': False, 'error': 'Job not found'}), 404
        
    job = export_jobs[job_id]
    return jsonify({
        'success': True,
        'job_id': job_id,
        'status': job['status'],
        'progress': job['progress'],
        'message': job['message'],
        'output_file': job['output_file'],
        'error': job['error']
    })

@app.route('/api/video/export/download/<job_id>', methods=['GET'])
def download_export(job_id):
    if job_id not in export_jobs:
        return jsonify({'success': False, 'error': 'Job not found'}), 404
        
    job = export_jobs[job_id]
    if job['status'] != 'completed' or not job['output_file']:
        return jsonify({'success': False, 'error': 'Export not ready'}), 400
        
    if not os.path.exists(job['output_file']):
        return jsonify({'success': False, 'error': 'Output file not found'}), 404
        
    return send_file(
        job['output_file'],
        as_attachment=True,
        download_name=f'edited_video_{job_id}.mp4',
        mimetype='video/mp4'
    )

def process_video_export_background(job_id, input_video, segments, settings):
    try:
        # Update job status
        export_jobs[job_id]['status'] = 'processing'
        export_jobs[job_id]['message'] = 'Getting video information...'
        export_jobs[job_id]['progress'] = 10
        
        # Create output directory
        output_dir = f'/tmp/export_{job_id}'
        os.makedirs(output_dir, exist_ok=True)
        
        # Get video info
        video_info = get_video_info(input_video)
        
        # Convert segments to DataFrame (similar to your Colab)
        df_data = []
        for i, segment in enumerate(segments):
            df_data.append({
                'start': segment['start'],
                'end': segment['end'],
                'description': segment.get('text', f'Segment {i}')
            })
        
        df = pd.DataFrame(df_data)
        df = df.sort_values('start').reset_index(drop=True)
        
        export_jobs[job_id]['message'] = 'Grouping segments...'
        export_jobs[job_id]['progress'] = 20
        
        # Group segments by pause threshold
        pause_threshold = settings.get('pause_threshold', 2.0)
        groups, cut_pauses = group_segments_by_pause(df, pause_threshold)
        
        export_jobs[job_id]['message'] = f'Creating {len(groups)} video clips...'
        export_jobs[job_id]['progress'] = 30
        
        # Create segment files
        segment_files = []
        for group_idx, group in enumerate(groups):
            progress = 30 + (group_idx / len(groups)) * 50  # 30-80% for clip creation
            export_jobs[job_id]['progress'] = int(progress)
            export_jobs[job_id]['message'] = f'Creating clip {group_idx + 1}/{len(groups)}...'
            
            segment_file = create_video_segment(
                input_video, group, group_idx, output_dir, video_info, settings
            )
            if segment_file:
                segment_files.append(segment_file)
        
        export_jobs[job_id]['message'] = 'Concatenating clips...'
        export_jobs[job_id]['progress'] = 85
        
        # Concatenate segments
        final_video = os.path.join(output_dir, f'final_video_{job_id}.mp4')
        concatenate_segments(segment_files, final_video)
        
        export_jobs[job_id]['message'] = 'Cleaning up...'
        export_jobs[job_id]['progress'] = 95
        
        # Cleanup temporary segment files
        for segment_file in segment_files:
            try:
                os.remove(segment_file)
            except:
                pass
        
        # Complete
        export_jobs[job_id]['status'] = 'completed'
        export_jobs[job_id]['progress'] = 100
        export_jobs[job_id]['message'] = 'Export completed successfully!'
        export_jobs[job_id]['output_file'] = final_video
        
    except Exception as e:
        export_jobs[job_id]['status'] = 'failed'
        export_jobs[job_id]['error'] = str(e)
        export_jobs[job_id]['message'] = f'Export failed: {str(e)}'

def get_video_info(video_path):
    cmd = [
        'ffprobe', '-v', 'error',
        '-select_streams', 'v:0',
        '-show_entries', 'stream=r_frame_rate,avg_frame_rate,codec_name,width,height',
        '-show_entries', 'format=duration',
        '-of', 'json',
        video_path
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"Error getting video info: {result.stderr}")

    data = json.loads(result.stdout)
    stream = data['streams'][0]

    def parse_framerate(rate_str):
        if '/' in rate_str:
            num, den = map(float, rate_str.split('/'))
            return num / den
        return float(rate_str)

    fps = parse_framerate(stream['r_frame_rate'])

    return {
        'fps': fps,
        'width': int(stream['width']),
        'height': int(stream['height']),
        'codec': stream['codec_name'],
        'duration': float(data['format']['duration'])
    }

def group_segments_by_pause(df, pause_threshold):
    groups = []
    current_group = []
    cut_pauses = []

    for idx, row in df.iterrows():
        start = row['start']
        end = row['end']

        if not current_group:
            current_group.append({
                'start': start,
                'end': end,
                'original_index': idx,
                'description': row.get('description', f'Segment {idx}')
            })
        else:
            last_end = current_group[-1]['end']
            pause_duration = start - last_end

            if pause_duration <= pause_threshold:
                current_group.append({
                    'start': start,
                    'end': end,
                    'original_index': idx,
                    'description': row.get('description', f'Segment {idx}')
                })
                if pause_duration > 0:
                    cut_pauses.append({
                        'start': last_end,
                        'end': start,
                        'duration': pause_duration,
                        'group': len(groups)
                    })
            else:
                groups.append(current_group)
                current_group = [{
                    'start': start,
                    'end': end,
                    'original_index': idx,
                    'description': row.get('description', f'Segment {idx}')
                }]

    if current_group:
        groups.append(current_group)

    return groups, cut_pauses

def sanitize_filename(text, max_length=50):
    text = str(text)
    text = re.sub(r'[<>:"/\\|?*]', '', text)
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[-\s]+', '_', text)
    if len(text) > max_length:
        text = text[:max_length].rsplit('_', 1)[0]
    return text.strip('_') if text.strip('_') else 'segment'

def create_video_segment(input_video, group, group_idx, output_dir, video_info, settings):
    group_start = group[0]['start']
    group_end = group[-1]['end']
    
    first_desc = group[0]['description']
    filename = f"segment_{group_idx:03d}_{sanitize_filename(first_desc)}.mp4"
    segment_path = os.path.join(output_dir, filename)
    
    # Quality settings
    quality_map = {
        'high': '18',
        'medium': '23', 
        'low': '28'
    }
    crf = quality_map.get(settings.get('exportQuality', 'medium'), '23')
    
    # Precise frame positioning
    start_frame = int(group_start * video_info['fps'])
    end_frame = int(group_end * video_info['fps'])
    precise_start = start_frame / video_info['fps']
    precise_end = end_frame / video_info['fps']

    cmd = [
        'ffmpeg', '-y',
        '-i', input_video,
        '-ss', str(precise_start),
        '-to', str(precise_end),
        '-c:v', 'libx264',
        '-preset', 'medium',
        '-crf', crf,
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-b:a', '256k',
        '-movflags', '+faststart',
        '-r', str(video_info['fps']),
        '-video_track_timescale', '90000',
        segment_path
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if result.returncode == 0:
        return segment_path
    else:
        raise RuntimeError(f"Failed to create segment {filename}: {result.stderr}")

def concatenate_segments(segment_files, output_path):
    if not segment_files:
        raise RuntimeError("No segments to concatenate")
        
    # Create concat list file
    concat_list_path = output_path.replace('.mp4', '_concat_list.txt')
    with open(concat_list_path, 'w') as f:
        for segment_file in segment_files:
            f.write(f"file '{os.path.abspath(segment_file)}'\n")

    # Concatenate
    concat_cmd = [
        'ffmpeg', '-y',
        '-f', 'concat',
        '-safe', '0',
        '-i', concat_list_path,
        '-c', 'copy',
        '-movflags', '+faststart',
        output_path
    ]

    result = subprocess.run(concat_cmd, capture_output=True, text=True)
    
    # Cleanup concat list
    try:
        os.remove(concat_list_path)
    except:
        pass
    
    if result.returncode != 0:
        raise RuntimeError(f"Concatenation failed: {result.stderr}")
        
    return output_path