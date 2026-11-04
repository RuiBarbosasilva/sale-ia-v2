import argparse
import os
import sys
from elevenlabs import ElevenLabs
from moviepy.editor import AudioFileClip, ColorClip, CompositeVideoClip, TextClip
from faster_whisper import WhisperModel
from dotenv import load_dotenv

load_dotenv()

def main():
    parser = argparse.ArgumentParser(description="Gerador de Vídeo Vertical com Legendas Dinâmicas")
    parser.add_argument('--text', required=True, help="Texto do roteiro para narração")
    parser.add_argument('--output', required=True, help="Caminho de saída do arquivo .mp4")
    parser.add_argument('--voice-id', default="21m00Tcm4TlvDq8ikWAM", help="ID da voz ElevenLabs (Padrão: Rachel)")
    
    args = parser.parse_args()

    try:
        print(f"🚀 Iniciando geração de vídeo...")
        
        # 1. Gerar Áudio
        print("🔊 Gerando áudio com ElevenLabs...")
        client = ElevenLabs(api_key=os.getenv("ELEVENLABS_API_KEY"))
        audio = client.text_to_speech.convert(
            voice_id=args.voice_id,
            output_format="mp3_44100_128",
            text=args.text,
            model_id="eleven_multilingual_v2"
        )
        
        temp_audio = args.output.replace(".mp4", ".mp3")
        with open(temp_audio, "wb") as f:
            for chunk in audio:
                f.write(chunk)
        
        # 2. Transcrever para Legendas
        print("🎙️ Transcrevendo áudio para sincronização de legendas...")
        model = WhisperModel("tiny", device="cpu", compute_type="int8")
        segments, _ = model.transcribe(temp_audio, word_timestamps=True)
        
        words = []
        for seg in segments:
            for word in seg.words:
                words.append({"text": word.word.strip(), "start": word.start, "end": word.end})

        # 3. Renderizar Vídeo (Full HD Vertical 1080x1920 - Padrão Reels/Shorts)
        print("🎬 Montando vídeo com legendas dinâmicas...")
        audio_clip = AudioFileClip(temp_audio)
        bg = ColorClip(size=(1080, 1920), color=(20, 20, 40), duration=audio_clip.duration)
        
        text_clips = []
        for item in words:
            duration = max(item["end"] - item["start"], 0.3)
            try:
                txt = TextClip(
                    item["text"].upper(), fontsize=80, font="Arial",
                    color="#FFD700", stroke_color="black", stroke_width=6,
                    method="caption", size=(900, 200), text_align="center"
                ).set_start(item["start"]).set_duration(duration).set_position("center")
                text_clips.append(txt)
            except Exception:
                pass # Ignora erros isolados de fonte
                
        final_video = CompositeVideoClip([bg] + text_clips + [audio_clip])
        
        print("💾 Renderizando vídeo final (aguarde)...")
        final_video.write_videofile(
            args.output, 
            fps=30, 
            codec="libx264", 
            audio_codec="aac", 
            preset="ultrafast", 
            threads=4,
            logger=None # Silencia logs verbosos do moviepy
        )
        
        # Limpeza
        if os.path.exists(temp_audio):
            os.remove(temp_audio)
            
        print(f"🎉 SUCESSO: Vídeo salvo em {args.output}")
        sys.exit(0)

    except Exception as e:
        print(f"❌ ERRO CRÍTICO: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
