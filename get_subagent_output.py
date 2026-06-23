import json

transcript_path = r"C:\Users\2172172606801\.gemini\antigravity-ide\brain\94551cd1-c2b1-4650-8df0-d9c774d3d8eb\.system_generated\logs\transcript.jsonl"

with open(transcript_path, 'r', encoding='utf-8') as f:
    for line in f:
        if not line.strip():
            continue
        data = json.loads(line)
        if data.get('type') == 'BROWSER_SUBAGENT' or 'check_white_screen' in str(data):
            print(f"--- STEP {data.get('step_index')} ---")
            print(json.dumps(data, indent=2, ensure_ascii=True))
            print("="*60)
