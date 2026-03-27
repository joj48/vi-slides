import React, { useRef, useState } from "react";
import { Pencil, Eraser, Shapes } from "lucide-react";

type Tool =
  | "pen"
  | "eraser"
  | "rect"
  | "circle"
  | "line"
  | "triangle"
  | "arrow";

const Whiteboard: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [tool, setTool] = useState<Tool>("pen");
  const [drawing, setDrawing] = useState(false);
  const [color, setColor] = useState("#ffffff");
  const [brushSize, setBrushSize] = useState(3);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [showShapes, setShowShapes] = useState(false);

  const snapshotRef = useRef<ImageData | null>(null);

  const [history, setHistory] = useState<ImageData[]>([]);
  const [redoStack, setRedoStack] = useState<ImageData[]>([]);

  const getCtx = () => canvasRef.current?.getContext("2d");

  // 🔥 SAVE STATE
  const saveState = () => {
    const ctx = getCtx();
    if (!ctx) return;

    const data = ctx.getImageData(
      0,
      0,
      ctx.canvas.width,
      ctx.canvas.height
    );

    setHistory((prev) => [...prev, data]);
    setRedoStack([]);
  };

  // 🔷 DRAW SHAPE
  const drawShape = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;

    if (tool === "rect") {
      ctx.strokeRect(startPos.x, startPos.y, x - startPos.x, y - startPos.y);
    }

    if (tool === "circle") {
      const r = Math.sqrt((x - startPos.x) ** 2 + (y - startPos.y) ** 2);
      ctx.beginPath();
      ctx.arc(startPos.x, startPos.y, r, 0, 2 * Math.PI);
      ctx.stroke();
    }

    if (tool === "line") {
      ctx.beginPath();
      ctx.moveTo(startPos.x, startPos.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    if (tool === "triangle") {
      ctx.beginPath();
      ctx.moveTo(startPos.x, startPos.y);
      ctx.lineTo(x, y);
      ctx.lineTo(startPos.x - (x - startPos.x), y);
      ctx.closePath();
      ctx.stroke();
    }

    if (tool === "arrow") {
      const headlen = 10;
      const dx = x - startPos.x;
      const dy = y - startPos.y;
      const angle = Math.atan2(dy, dx);

      ctx.beginPath();
      ctx.moveTo(startPos.x, startPos.y);
      ctx.lineTo(x, y);
      ctx.lineTo(
        x - headlen * Math.cos(angle - Math.PI / 6),
        y - headlen * Math.sin(angle - Math.PI / 6)
      );
      ctx.moveTo(x, y);
      ctx.lineTo(
        x - headlen * Math.cos(angle + Math.PI / 6),
        y - headlen * Math.sin(angle + Math.PI / 6)
      );
      ctx.stroke();
    }
  };

  // 🟢 START
  const start = (e: React.MouseEvent) => {
    const ctx = getCtx();
    if (!ctx) return;

    saveState();

    const x = e.nativeEvent.offsetX;
    const y = e.nativeEvent.offsetY;

    setStartPos({ x, y });

    if (tool !== "pen" && tool !== "eraser") {
      snapshotRef.current = ctx.getImageData(
        0,
        0,
        ctx.canvas.width,
        ctx.canvas.height
      );
    }

    if (tool === "pen" || tool === "eraser") {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }

    setDrawing(true);
  };

  // 🟡 DRAW
  const draw = (e: React.MouseEvent) => {
    if (!drawing) return;
    const ctx = getCtx();
    if (!ctx) return;

    const x = e.nativeEvent.offsetX;
    const y = e.nativeEvent.offsetY;

    if (tool === "pen") {
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
      ctx.lineCap = "round";
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    if (tool === "eraser") {
      ctx.strokeStyle = "#1e1e1e";
      ctx.lineWidth = brushSize * 2;
      ctx.lineCap = "round";
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    if (tool !== "pen" && tool !== "eraser") {
      if (!snapshotRef.current) return;

      ctx.putImageData(snapshotRef.current, 0, 0);
      drawShape(ctx, x, y);
    }
  };

  // 🔴 STOP
  const stop = (e: React.MouseEvent) => {
    if (!drawing) return;
    const ctx = getCtx();
    if (!ctx) return;

    const x = e.nativeEvent.offsetX;
    const y = e.nativeEvent.offsetY;

    if (tool !== "pen" && tool !== "eraser") {
      drawShape(ctx, x, y);
    }

    setDrawing(false);
    snapshotRef.current = null;
  };

  // 🔁 UNDO
const undo = () => {
  const ctx = getCtx();
  if (!ctx) return;

  if (history.length === 0) return;

  const newHistory = [...history];
  const last = newHistory.pop();

  if (!last) return;

  // Save current state to redo
  const current = ctx.getImageData(
    0,
    0,
    ctx.canvas.width,
    ctx.canvas.height
  );

  setRedoStack((prev) => [...prev, current]);
  setHistory(newHistory);

  ctx.putImageData(last, 0, 0);
};

  // 🔁 REDO 
const redo = () => {
  const ctx = getCtx();
  if (!ctx) return;

  if (redoStack.length === 0) return;

  const newRedo = [...redoStack];
  const last = newRedo.pop();

  if (!last) return;

  // Save current state to history
  const current = ctx.getImageData(
    0,
    0,
    ctx.canvas.width,
    ctx.canvas.height
  );

  setHistory((prev) => [...prev, current]);
  setRedoStack(newRedo);

  ctx.putImageData(last, 0, 0);
};

  // 🧹 CLEAR
  const clearCanvas = () => {
    const ctx = getCtx();
    if (!ctx) return;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    setHistory([]);
    setRedoStack([]);
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#1e1e1e] overflow-hidden rounded-lg">
      
      {/* 🔥 TOOLBAR */}
      <div className="flex items-center gap-3 px-4 py-2 bg-[#2b2b2b] text-white">

        <span className="font-semibold mr-4">Whiteboard Toolbar</span>

        <button onClick={() => setTool("pen")} className="p-2 bg-gray-700 rounded">
          <Pencil size={18} />
        </button>

        <button onClick={() => setTool("eraser")} className="p-2 bg-gray-700 rounded">
          <Eraser size={18} />
        </button>

        {/* Shapes */}
        <div className="relative">
          <button
            onClick={() => setShowShapes(!showShapes)}
            className="p-2 bg-gray-700 rounded"
          >
            <Shapes size={18} />
          </button>

          {showShapes && (
            <div className="absolute top-12 left-0 flex flex-col gap-2 bg-[#2b2b2b] border border-gray-600 rounded p-2">
              <button onClick={() => { setTool("rect"); setShowShapes(false); }}>▭</button>
              <button onClick={() => { setTool("circle"); setShowShapes(false); }}>◯</button>
              <button onClick={() => { setTool("line"); setShowShapes(false); }}>／</button>
              <button onClick={() => { setTool("triangle"); setShowShapes(false); }}>△</button>
              <button onClick={() => { setTool("arrow"); setShowShapes(false); }}>➝</button>
            </div>
          )}
        </div>

        <input
          type="range"
          min="1"
          max="10"
          value={brushSize}
          onChange={(e) => setBrushSize(Number(e.target.value))}
        />

        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />

        <button onClick={undo} className="bg-gray-700 px-2 py-1 rounded">
          Undo
        </button>

        <button onClick={redo} className="bg-gray-700 px-2 py-1 rounded">
          Redo
        </button>

        <button onClick={clearCanvas} className="bg-red-500 px-3 py-1 rounded">
          Clear
        </button>
      </div>

      {/* 🎨 FULL CANVAS */}
      <div className="flex-1">
        <canvas
          ref={canvasRef}
          width={1200}
          height={600}
          className="w-full h-full"
          style={{ cursor: "crosshair" }}
          onMouseDown={start}
          onMouseMove={draw}
          onMouseUp={stop}
          onMouseLeave={stop}
        />
      </div>
    </div>
  );
};

export default Whiteboard;