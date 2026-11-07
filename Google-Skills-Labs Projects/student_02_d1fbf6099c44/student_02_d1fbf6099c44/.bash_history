export API_KEY="AIzaSyDrwYoJeWixrmHEIITQgM8ZTl1IcoJjbTw"
cat <<'EOF' > synthesize-text.json
{
  "input": {
    "text": "Cloud Text-to-Speech API allows developers to include natural-sounding, synthetic human speech as playable audio in their applications. The Text-to-Speech API converts text or Speech Synthesis Markup Language (SSML) input into audio data like MP3 or LINEAR16 (the encoding used in WAV files)."
  },
  "voice": {
    "languageCode": "en-gb",
    "name": "en-GB-Standard-A",
    "ssmlGender": "FEMALE"
  },
  "audioConfig": {
    "audioEncoding": "MP3"
  }
}
EOF

curl -s -X POST -H "X-Goog-Api-Key: ${API_KEY}"     -H "Content-Type: application/json; charset=utf-8"     --data @synthesize-text.json     "https://texttospeech.googleapis.com/v1/text:synthesize" > synthesize-text.txt
python3 tts_decode.py --input "synthesize-text.txt" --output "synthesize-text-audio.mp3"
gcloud storage cp synthesize-text.txt gs://qwiklabs-gcp-03-1dcdc144c734-speech/
gcloud storage cp synthesize-text-audio.mp3 gs://qwiklabs-gcp-03-1dcdc144c734-speech/
cat <<'EOF' > synthesize-text.json
{
  "input": {
    "text": "Cloud Text-to-Speech API allows developers to include natural-sounding, synthetic human speech as playable audio in their applications. The Text-to-Speech API converts text or Speech Synthesis Markup Language (SSML) input into audio data like MP3 or LINEAR16 (the encoding used in WAV files)."
  },
  "voice": {
    "languageCode": "en-gb",
    "name": "en-GB-Standard-A",
    "ssmlGender": "FEMALE"
  },
  "audioConfig": {
    "audioEncoding": "MP3"
  }
}
EOF

curl -s -X POST -H "X-Goog-Api-Key: ${API_KEY}"     -H "Content-Type: application/json; charset=utf-8"     --data @synthesize-text.json     "https://texttospeech.googleapis.com/v1/text:synthesize" > synthesize-text.txt
cat <<'EOF' > tts_decode.py
import argparse
from base64 import decodebytes
import json

def decode_tts_output(input_file, output_file):
    with open(input_file) as input:
        response = json.load(input)
        audio_data = response['audioContent']
        with open(output_file, "wb") as new_file:
            new_file.write(decodebytes(audio_data.encode('utf-8')))

if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description="Decode output from Cloud Text-to-Speech",
        formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--input', help='The response from the text-to-speech API.', required=True)
    parser.add_argument('--output', help='The name of the audio file to create', required=True)
    args = parser.parse_args()
    decode_tts_output(args.input, args.output)
EOF

python3 tts_decode.py --input "synthesize-text.txt" --output "synthesize-text-audio.mp3"
gcloud storage cp synthesize-text.txt gs://qwiklabs-gcp-03-1dcdc144c734-speech/
gcloud storage cp synthesize-text-audio.mp3 gs://qwiklabs-gcp-03-1dcdc144c734-speech/
cat <<'EOF' > synthesize-text.json
{
  "input": {
    "text": "Cloud Text-to-Speech API allows developers to include natural-sounding, synthetic human speech as playable audio in their applications. The Text-to-Speech API converts text or Speech Synthesis Markup Language (SSML) input into audio data like MP3 or LINEAR16 (the encoding used in WAV files)."
  },
  "voice": {
    "languageCode": "en-gb",
    "name": "en-GB-Standard-A",
    "ssmlGender": "FEMALE"
  },
  "audioConfig": {
    "audioEncoding": "MP3"
  }
}
EOF

head -c 200 synthesize-text.txt
python3 tts_decode.py --input "synthesize-text.txt" --output "synthesize-text-audio.mp3"
ls -lh synthesize-text-audio.mp3
gcloud auth list
gcloud storage ls gs://qwiklabs-gcp-03-1dcdc144c734-speech/
gcloud auth login --no-launch-browser
gcloud storage cp synthesize-text.txt gs://qwiklabs-gcp-03-1dcdc144c734-speech/
gcloud storage cp synthesize-text-audio.mp3 gs://qwiklabs-gcp-03-1dcdc144c734-speech/
gcloud storage ls gs://qwiklabs-gcp-03-1dcdc144c734-speech/
clear
