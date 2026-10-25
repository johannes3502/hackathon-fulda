from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import sys, subprocess, math, shutil

try:
    import imageio_ffmpeg
except ImportError:
    imageio_ffmpeg = None

out=Path(__file__).resolve().parent.parent / 'public/review-demo'
out.mkdir(parents=True, exist_ok=True)
logo_path=Path(__file__).resolve().parent.parent / 'public/brand/418-pitch-practice-mark.png'
logo=Image.open(logo_path).convert('RGB')
logo.thumbnail((54,54), Image.LANCZOS)
logo_mask=Image.new('L',logo.size,0)
ImageDraw.Draw(logo_mask).ellipse((0,0)+logo.size,fill=255)
font_dir = Path('C:/Windows/Fonts')
serif_path = str(font_dir/'georgia.ttf') if font_dir.exists() else '/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf'
sans_path = str(font_dir/'segoeui.ttf') if font_dir.exists() else '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
serif=ImageFont.truetype(serif_path, 52)
brand=ImageFont.truetype(serif_path, 34)
sans=ImageFont.truetype(sans_path, 16)
small=ImageFont.truetype(sans_path, 12)
medium=ImageFont.truetype(sans_path, 22)
scenes=[(0,'01 / DER EINSTIEG',['Lernen beginnt','mit einer Frage.'],'Problem. Idee. Nächster Schritt.'),(15,'02 / DIE IDEE',['Ein Gedanke.','Gemeinsam weiter.'],'Eine offene Geste begleitet den Vergleich.'),(28,'03 / DER SPRECHFLUSS',['Die, die Idee ist …','ähm … gemeinsam.'],'Ein stockender Satz mit Füllwörtern.'),(38,'04 / DER PILOT',['Unser erster Pilot:','20 Teilnehmende.'],'Der Widerspruch zur Quelle: 12.'),(52,'05 / DER NÄCHSTE SCHRITT',['Von der Idee','in den ersten Pilot.'],'Zusammenfassen. Überleiten. Konkret werden.'),(70,'06 / DER ABSCHLUSS',['Was bleibt?','Ein nächster Versuch.'],'Eine Pause. Eine Kernaussage. Ein Ausblick.')]
backgrounds=[]
for start,section,lines,caption in scenes:
    im=Image.new('RGB',(960,540),'#f3f7f3'); d=ImageDraw.Draw(im)
    d.rounded_rectangle((22,22,938,518),radius=20,fill='#ffffff')
    im.paste(logo,(48,48),logo_mask)
    d.line((52,119,908,119),fill='#e2eae4',width=1)
    d.text((55,158),section,font=sans,fill='#657c6c')
    for i,line in enumerate(lines):d.text((52,202+i*68),line,font=serif,fill='#142019')
    d.text((55,370),caption,font=sans,fill='#6b7e71')
    d.text((55,453),'Lernen, das zu dir passt',font=small,fill='#6b7e71')
    d.ellipse((681,166,893,378),fill='#e9fff1')
    backgrounds.append(im)
ffmpeg=shutil.which('ffmpeg') or (imageio_ffmpeg.get_ffmpeg_exe() if imageio_ffmpeg else None)
if not ffmpeg:
    raise RuntimeError('ffmpeg not found; install ffmpeg or imageio-ffmpeg')

proc=subprocess.Popen([ffmpeg,'-y','-f','rawvideo','-vcodec','rawvideo','-pix_fmt','rgb24','-s','960x540','-r','10','-i','-','-an','-c:v','libx264','-preset','fast','-crf','26','-pix_fmt','yuv420p','-g','20','-movflags','+faststart',str(out/'presentation.mp4')],stdin=subprocess.PIPE,stderr=subprocess.PIPE)
for frame in range(900):
    t=frame/10
    scene=max(i for i,s in enumerate(scenes) if t>=s[0])
    im=backgrounds[scene].copy();d=ImageDraw.Draw(im)
    # Stylized figure: clearly illustrated, never presented as a real recording.
    cx=788; cy=235
    d.ellipse((cx-21,cy-45,cx+21,cy-3),fill='#244431')
    d.rounded_rectangle((cx-32,cy+5,cx+32,cy+86),radius=22,fill='#244431')
    gesture=math.sin(t*1.1)*13
    arm_left=(cx-72,cy+38-gesture);arm_right=(cx+74,cy+20+gesture)
    d.line([(cx-23,cy+24),arm_left],fill='#244431',width=12)
    d.line([(cx+23,cy+24),arm_right],fill='#244431',width=12)
    for px,py in [arm_left,arm_right]:d.ellipse((px-5,py-5,px+5,py+5),fill='#42ff8c')
    d.text((725,395),'ILLUSTRATION',font=small,fill='#809888')
    d.text((844,453),f'{int(t)//60}:{int(t)%60:02}',font=small,fill='#6b7e71')
    d.line((54,489,906,489),fill='#e7eee9',width=3)
    d.line((54,489,int(54+852*t/90),489),fill='#42ff8c',width=3)
    if frame==0:im.save(out/'poster.png')
    proc.stdin.write(im.tobytes())
proc.stdin.close()
log=proc.stderr.read().decode(errors='replace');code=proc.wait()
if code:raise RuntimeError(log)
print('Created synthetic 90-second MP4:',(out/'presentation.mp4').stat().st_size,'bytes')
