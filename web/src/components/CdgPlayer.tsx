import React, { useEffect, useRef } from 'react';

export default function CdgPlayer({ mp3Url, cdgUrl, onEnd }:{ mp3Url:string; cdgUrl:string; onEnd?:()=>void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(()=>{
    let stopped = false;
    const audio = new Audio(mp3Url);
    audio.addEventListener('ended', ()=> onEnd && onEnd());
    audio.play().catch(()=>{});

    const ctx = canvasRef.current!.getContext('2d')!;
    function draw() {
      if (stopped) return;
      const w = canvasRef.current!.width, h = canvasRef.current!.height;
      ctx.fillStyle = 'black'; ctx.fillRect(0,0,w,h);
      ctx.fillStyle = 'white'; ctx.font = '20px sans-serif';
      ctx.fillText('CD+G Rendering (MVP)', 10, 30);
      requestAnimationFrame(draw);
    }
    draw();
    return ()=>{ stopped = true; audio.pause(); };
  }, [mp3Url, cdgUrl, onEnd]);

  return <canvas ref={canvasRef} width={300} height={216} style={{ width:'100%', background:'black' }} />
}
