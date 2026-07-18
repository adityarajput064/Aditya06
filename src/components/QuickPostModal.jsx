import { useState, useEffect, useRef } from "react";
import { X, Smile, Users, Camera, Laugh, Images, Check, RotateCcw, ZoomIn } from "lucide-react";
import api from "../utils/api";

// === NAYA: Photo/Meme quick post — caption + image + mood + tag people ===

const MOODS = [
  { emoji: "😊", label: "Happy" },
  { emoji: "😂", label: "Laughing" },
  { emoji: "😍", label: "In Love" },
  { emoji: "🥳", label: "Celebrating" },
  { emoji: "😎", label: "Chill" },
  { emoji: "🔥", label: "Excited" },
  { emoji: "🤩", label: "Amazed" },
  { emoji: "🙃", label: "Silly" },
  { emoji: "😴", label: "Tired" },
  { emoji: "😢", label: "Sad" },
  { emoji: "😭", label: "Crying" },
  { emoji: "😡", label: "Annoyed" },
  { emoji: "😤", label: "Frustrated" },
  { emoji: "🥺", label: "Emotional" },
  { emoji: "😬", label: "Awkward" },
  { emoji: "🤔", label: "Thoughtful" },
  { emoji: "🤯", label: "Mind Blown" },
  { emoji: "😅", label: "Nervous" },
  { emoji: "🤒", label: "Sick" },
  { emoji: "📚", label: "Studying" },
  { emoji: "💪", label: "Motivated" },
  { emoji: "🥱", label: "Bored" },
  { emoji: "🎉", label: "Festive" },
  { emoji: "❤️", label: "Grateful" },
];

// NAYA — crop box (square) aur output resolution
const CROP_BOX = 300;
const CROP_OUTPUT = 900;

export const QuickPostModal = ({ type, onSubmit, onClose }) => {
  const [caption, setCaption] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [mood, setMood] = useState(null);
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [users, setUsers] = useState([]);
  const [taggedUsers, setTaggedUsers] = useState([]);
  const [showTagPicker, setShowTagPicker] = useState(false);

  // NAYA — cropper state
  const [cropSrc, setCropSrc] = useState(""); // raw image jo crop hone wali hai
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const cropImgRef = useRef(null);
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, origX: 0, origY: 0 });

  // NAYA — in-app live camera state (OS ke file-picker pe depend nahi karta)
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fallbackCameraInputRef = useRef(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.get("/api/users");
        setUsers(res.data);
      } catch (err) { console.error(err); }
    };
    fetchUsers();
  }, []);

  // NAYA — camera stream ready hote hi video element se attach karo
  useEffect(() => {
    if (showCamera && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [showCamera]);

  // component unmount pe camera band karna zaroori hai
  useEffect(() => {
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // NAYA — gallery ya camera dono se yahi function call hota hai
  const handleFileSelected = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 8000000) { alert("File 8MB se badi hai!"); return; }
    const reader = new FileReader();
    reader.onloadend = () => setCropSrc(reader.result); // upload/click hote hi cropper khulega
    reader.readAsDataURL(file);
    e.target.value = ""; // same file dobara select karne de sake isliye reset
  };

  // NAYA — in-app live camera khologe (guaranteed camera, file-picker nahi)
  const openCamera = async () => {
    setCameraError("");
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      // purane browser jo getUserMedia support nahi karte, unke liye fallback
      fallbackCameraInputRef.current?.click();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      setShowCamera(true);
    } catch (err) {
      // permission block ya HTTPS na hone jaisi wajah se camera nahi khula — fallback try karo
      console.error(err);
      setCameraError("Camera access nahi mil paya. Permission check karo, ya neeche se try karo.");
      fallbackCameraInputRef.current?.click();
    }
  };

  const closeCamera = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setShowCamera(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    closeCamera();
    setCropSrc(dataUrl); // seedha crop screen mein chala jayega
  };

  const getBaseScale = () => {
    if (!naturalSize.w || !naturalSize.h) return 1;
    return Math.max(CROP_BOX / naturalSize.w, CROP_BOX / naturalSize.h);
  };

  const clampPos = (x, y, dispW, dispH) => {
    const minX = Math.min(0, CROP_BOX - dispW);
    const minY = Math.min(0, CROP_BOX - dispH);
    return { x: Math.max(minX, Math.min(0, x)), y: Math.max(minY, Math.min(0, y)) };
  };

  const onCropImageLoad = (e) => {
    const img = e.target;
    const w = img.naturalWidth, h = img.naturalHeight;
    setNaturalSize({ w, h });
    const baseScale = Math.max(CROP_BOX / w, CROP_BOX / h);
    const dispW = w * baseScale, dispH = h * baseScale;
    setZoom(1);
    setPos({ x: (CROP_BOX - dispW) / 2, y: (CROP_BOX - dispH) / 2 });
  };

  const handleZoomChange = (val) => {
    const baseScale = getBaseScale();
    const newScale = baseScale * val;
    const dispW = naturalSize.w * newScale, dispH = naturalSize.h * newScale;
    setZoom(val);
    setPos((p) => clampPos(p.x, p.y, dispW, dispH));
  };

  const startDrag = (e) => {
    const point = e.touches ? e.touches[0] : e;
    dragRef.current = { dragging: true, startX: point.clientX, startY: point.clientY, origX: pos.x, origY: pos.y };
  };

  const onDrag = (e) => {
    if (!dragRef.current.dragging) return;
    const point = e.touches ? e.touches[0] : e;
    const dx = point.clientX - dragRef.current.startX;
    const dy = point.clientY - dragRef.current.startY;
    const scale = getBaseScale() * zoom;
    const dispW = naturalSize.w * scale, dispH = naturalSize.h * scale;
    setPos(clampPos(dragRef.current.origX + dx, dragRef.current.origY + dy, dispW, dispH));
  };

  const endDrag = () => { dragRef.current.dragging = false; };

  const handleCropCancel = () => { setCropSrc(""); };

  const handleCropConfirm = () => {
    const scale = getBaseScale() * zoom;
    const sx = -pos.x / scale;
    const sy = -pos.y / scale;
    const sSize = CROP_BOX / scale;
    const canvas = document.createElement("canvas");
    canvas.width = CROP_OUTPUT;
    canvas.height = CROP_OUTPUT;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(cropImgRef.current, sx, sy, sSize, sSize, 0, 0, CROP_OUTPUT, CROP_OUTPUT);
    setImagePreview(canvas.toDataURL("image/jpeg", 0.92));
    setCropSrc("");
  };

  const reopenCropper = () => {
    // pehle se cropped image ko dobara crop karne ke liye
    setCropSrc(imagePreview);
  };

  const toggleTag = (username) => {
    setTaggedUsers((prev) =>
      prev.includes(username) ? prev.filter((u) => u !== username) : [...prev, username]
    );
  };

  const handleSubmit = () => {
    if (!imagePreview) {
      alert(type === "meme" ? "Meme image lagao pehle!" : "Photo lagao pehle!");
      return;
    }
    onSubmit({
      type,
      content: caption,
      imageUrl: imagePreview,
      mood: mood ? `${mood.emoji} ${mood.label}` : "",
      tags: taggedUsers,
    });
  };

  const title = type === "meme" ? "Share a Meme" : "Share a Photo";
  const TitleIcon = type === "meme" ? Laugh : Camera;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[60] backdrop-blur-sm">
      <div
        className="rounded-2xl border w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
        style={{ background: "var(--surface-1)", borderColor: "var(--border-subtle)" }}
      >
        <div className="flex justify-between items-center border-b p-5" style={{ borderColor: "var(--border-subtle)" }}>
          <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: "var(--accent-1)" }}>
            <TitleIcon size={19} /> {title}
          </h2>
          <button onClick={onClose} style={{ color: "var(--text-muted)" }}>
            <X size={20} />
          </button>
        </div>

        <div className="p-5">
          {imagePreview ? (
            <div className="relative mb-4">
              <img
                src={imagePreview}
                className="rounded-xl max-h-72 w-full object-cover border"
                style={{ borderColor: "var(--border-subtle)" }}
                alt="Preview"
              />
              <button
                onClick={() => setImagePreview("")}
                className="absolute top-2 right-2 rounded-full w-8 h-8 flex items-center justify-center"
                style={{ background: "rgba(239,68,68,0.85)", color: "#fff" }}
              >
                <X size={16} />
              </button>
              {/* NAYA — dobara crop karne ka option */}
              <button
                onClick={reopenCropper}
                className="absolute bottom-2 right-2 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
                style={{ background: "rgba(0,0,0,0.6)", color: "#fff" }}
              >
                <RotateCcw size={13} /> Recrop
              </button>
            </div>
          ) : (
            // NAYA — Gallery aur Camera, dono alag buttons
            <div className="grid grid-cols-2 gap-3 mb-4">
              <label
                className="cursor-pointer flex flex-col items-center justify-center gap-2 py-8 rounded-xl border-2 border-dashed transition"
                style={{ borderColor: "var(--border-subtle)", color: "var(--text-muted)" }}
              >
                <input type="file" accept="image/*" onChange={handleFileSelected} className="hidden" />
                <Images size={26} strokeWidth={1.5} />
                <span className="text-xs font-medium">Gallery se chuno</span>
              </label>
              <button
                type="button"
                onClick={openCamera}
                className="cursor-pointer flex flex-col items-center justify-center gap-2 py-8 rounded-xl border-2 border-dashed transition"
                style={{ borderColor: "var(--border-subtle)", color: "var(--text-muted)" }}
              >
                <Camera size={26} strokeWidth={1.5} />
                <span className="text-xs font-medium">Camera se click karo</span>
              </button>
              {/* fallback — agar getUserMedia fail ho jaye to isse OS ka camera trigger hota hai */}
              <input
                ref={fallbackCameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelected}
                className="hidden"
              />
            </div>
          )}

          {cameraError && (
            <p className="text-xs mb-3 -mt-2" style={{ color: "#f87171" }}>{cameraError}</p>
          )}

          {/* NAYA — LIVE CAMERA VIEW: guaranteed camera, OS file-picker pe depend nahi */}
          {showCamera && (
            <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-[70] p-4">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="rounded-2xl max-h-[70vh] w-full object-cover"
                style={{ maxWidth: 480 }}
              />
              <div className="flex items-center gap-6 mt-6">
                <button
                  onClick={closeCamera}
                  className="px-5 py-2.5 rounded-xl font-semibold text-sm"
                  style={{ background: "var(--surface-2)", color: "var(--text-main)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={capturePhoto}
                  className="w-16 h-16 rounded-full border-4 flex items-center justify-center"
                  style={{ borderColor: "#fff", background: "var(--accent-1)" }}
                  aria-label="Click photo"
                />
              </div>
            </div>
          )}

          {/* NAYA — CROP OVERLAY: image select/click hote hi ye khulta hai */}
          {cropSrc && (
            <div className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center z-[70] p-4">
              <p className="text-sm font-medium mb-3" style={{ color: "#fff" }}>Drag karke position set karo, zoom slider use karo</p>
              <div
                className="relative rounded-2xl overflow-hidden border-2"
                style={{ width: CROP_BOX, height: CROP_BOX, borderColor: "var(--accent-1)", touchAction: "none", cursor: "grab" }}
                onMouseDown={startDrag}
                onMouseMove={onDrag}
                onMouseUp={endDrag}
                onMouseLeave={endDrag}
                onTouchStart={startDrag}
                onTouchMove={onDrag}
                onTouchEnd={endDrag}
              >
                <img
                  ref={cropImgRef}
                  src={cropSrc}
                  onLoad={onCropImageLoad}
                  draggable={false}
                  alt="Crop preview"
                  style={{
                    position: "absolute",
                    left: pos.x,
                    top: pos.y,
                    width: naturalSize.w * getBaseScale() * zoom,
                    height: naturalSize.h * getBaseScale() * zoom,
                    userSelect: "none",
                    pointerEvents: "none",
                  }}
                />
              </div>

              <div className="flex items-center gap-2 w-full max-w-xs mt-4">
                <ZoomIn size={16} style={{ color: "#fff" }} />
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.01"
                  value={zoom}
                  onChange={(e) => handleZoomChange(Number(e.target.value))}
                  className="w-full accent-cyan-500"
                />
              </div>

              <div className="flex gap-3 mt-5">
                <button
                  onClick={handleCropCancel}
                  className="px-5 py-2.5 rounded-xl font-semibold text-sm"
                  style={{ background: "var(--surface-2)", color: "var(--text-main)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCropConfirm}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-semibold text-sm"
                  style={{ background: "var(--accent-1)", color: "var(--bg-base)" }}
                >
                  <Check size={16} /> Use Photo
                </button>
              </div>
            </div>
          )}

          <textarea
            className="w-full p-4 rounded-xl mb-4 outline-none text-base resize-none border"
            style={{ background: "var(--surface-2)", borderColor: "var(--border-subtle)", color: "var(--text-main)" }}
            rows="3"
            placeholder="Caption likho..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />

          <div className="flex gap-2 mb-4 relative">
            <button
              onClick={() => { setShowMoodPicker((s) => !s); setShowTagPicker(false); }}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition"
              style={{ background: "var(--surface-2)", color: mood ? "var(--accent-1)" : "var(--text-muted)" }}
            >
              <Smile size={15} /> {mood ? `${mood.emoji} ${mood.label}` : "Add mood"}
            </button>
            <button
              onClick={() => { setShowTagPicker((s) => !s); setShowMoodPicker(false); }}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition"
              style={{ background: "var(--surface-2)", color: taggedUsers.length ? "var(--accent-1)" : "var(--text-muted)" }}
            >
              <Users size={15} /> {taggedUsers.length ? `${taggedUsers.length} tagged` : "Tag people"}
            </button>

            {showMoodPicker && (
              <div
                className="absolute top-12 left-0 z-20 grid grid-cols-4 gap-1 p-3 rounded-xl border shadow-xl w-72 max-h-64 overflow-y-auto"
                style={{ background: "var(--surface-1)", borderColor: "var(--border-subtle)" }}
              >
                {MOODS.map((m) => (
                  <button
                    key={m.label}
                    onClick={() => { setMood(m); setShowMoodPicker(false); }}
                    className="flex flex-col items-center gap-1 p-2 rounded-lg text-[10px] transition"
                    style={{ color: "var(--text-main)" }}
                  >
                    <span className="text-xl">{m.emoji}</span>
                    {m.label}
                  </button>
                ))}
              </div>
            )}

            {showTagPicker && (
              <div
                className="absolute top-12 left-0 z-20 max-h-56 overflow-y-auto p-2 rounded-xl border shadow-xl w-64 space-y-1"
                style={{ background: "var(--surface-1)", borderColor: "var(--border-subtle)" }}
              >
                {users.length === 0 ? (
                  <p className="text-xs text-center py-3" style={{ color: "var(--text-muted)" }}>Koi student nahi mila.</p>
                ) : (
                  users.map((u) => (
                    <label
                      key={u.username}
                      className="flex items-center gap-2 p-2 rounded-lg cursor-pointer text-sm"
                      style={{
                        background: taggedUsers.includes(u.username) ? "color-mix(in srgb, var(--accent-1) 10%, transparent)" : "transparent",
                        color: "var(--text-main)",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={taggedUsers.includes(u.username)}
                        onChange={() => toggleTag(u.username)}
                        className="accent-cyan-500"
                      />
                      {u.username}
                    </label>
                  ))
                )}
              </div>
            )}
          </div>

          {taggedUsers.length > 0 && (
            <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
              Tagged: {taggedUsers.map((u) => `@${u}`).join(", ")}
            </p>
          )}

          <button
            onClick={handleSubmit}
            className="w-full py-3 rounded-xl font-semibold transition"
            style={{ background: "var(--accent-1)", color: "var(--bg-base)" }}
          >
            Share {type === "meme" ? "meme" : "photo"}
          </button>
        </div>
      </div>
    </div>
  );
};