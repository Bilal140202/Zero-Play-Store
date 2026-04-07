import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { ToolBar, ToolType } from "@/components/ToolBar";
import { ContextToolbar } from "@/components/ContextToolbar";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import * as FileSystem from "expo-file-system/legacy";
import { WebView } from "react-native-webview";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  addTextAnnotation,
  shareExistingPdf,
  embedAnnotationsToPdf,
} from "@/lib/pdfEngine";

const BOOKMARKS_KEY = "pdfx_bookmarks_v1";

// ─── PDF.js HTML template with full annotation canvas system ────────────────

function buildPdfHtml(base64: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body { background:#111118; overflow-x:hidden; -webkit-user-select:none; user-select:none; }
    #status { color:#94A3B8; font-family:-apple-system,sans-serif; font-size:15px; text-align:center; padding:60px 24px; }
    #error { color:#F87171; font-family:-apple-system,sans-serif; font-size:14px; text-align:center; padding:60px 24px; display:none; }
    .page-wrap { position:relative; margin:10px auto; background:#FFF; box-shadow:0 4px 20px rgba(0,0,0,0.6); display:block; }
    .pdf-page { display:block; }
    .annot-layer { position:absolute; top:0; left:0; pointer-events:none; touch-action:none; }
  </style>
</head>
<body>
  <div id="status">Rendering PDF\u2026</div>
  <div id="error"></div>
  <div id="container"></div>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
  <script>
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    function post(obj) {
      try { window.ReactNativeWebView.postMessage(JSON.stringify(obj)); } catch(e) {}
    }

    // ─── Annotation State ──────────────────────────────────────────────────
    window.__annotations = {};   // { "1": [...], "2": [...] }  1-indexed page keys
    var __pageCanvases = {};     // pageNum -> <canvas> element
    var __drawTool    = 'none';  // 'freehand'|'highlight'|'rect'|'ellipse'|'arrow'|'line'|'eraser'|'none'
    var __drawColor   = '#EF4444';
    var __strokeWidth = 4;

    // ─── Public JS API (called from React Native via injectJavaScript) ─────
    window.setAnnotationTool = function(tool, color, sw) {
      __drawTool = tool || 'none';
      if (color) __drawColor = color;
      if (sw)    __strokeWidth = +sw;
      _updatePointerEvents();
    };
    window.setAnnotationColor = function(color) {
      __drawColor = color;
    };
    window.setAnnotationStrokeWidth = function(sw) {
      __strokeWidth = +sw;
    };
    window.clearAllAnnotations = function() {
      window.__annotations = {};
      Object.keys(__pageCanvases).forEach(function(pn) {
        var ac = __pageCanvases[pn];
        ac.getContext('2d').clearRect(0, 0, ac.width, ac.height);
      });
    };
    window.undoLastAnnotation = function() {
      var lastPage = null, lastCount = -1;
      Object.keys(window.__annotations).forEach(function(pn) {
        var len = (window.__annotations[pn] || []).length;
        if (len > lastCount) { lastCount = len; lastPage = pn; }
      });
      if (lastPage !== null && lastCount > 0) {
        window.__annotations[lastPage].pop();
        _redrawPage(+lastPage);
      }
    };

    // Handle messages sent from React Native
    function _onRNMessage(e) {
      try {
        var msg = JSON.parse(e.data);
        if (msg.cmd === 'setTool')  window.setAnnotationTool(msg.tool, msg.color, msg.sw);
        if (msg.cmd === 'setColor') window.setAnnotationColor(msg.color);
        if (msg.cmd === 'setSW')    window.setAnnotationStrokeWidth(msg.sw);
        if (msg.cmd === 'getAnnotations') post({ type: 'annotations', data: JSON.stringify(window.__annotations) });
        if (msg.cmd === 'clear')    window.clearAllAnnotations();
        if (msg.cmd === 'undo')     window.undoLastAnnotation();
      } catch(_) {}
    }
    document.addEventListener('message', _onRNMessage);
    window.addEventListener('message', _onRNMessage);

    function _updatePointerEvents() {
      var active = __drawTool !== 'none';
      Object.keys(__pageCanvases).forEach(function(pn) {
        var ac = __pageCanvases[pn];
        ac.style.pointerEvents = active ? 'auto' : 'none';
      });
      document.body.style.overflow = active ? 'hidden' : 'auto';
    }

    // ─── Canvas helpers ────────────────────────────────────────────────────
    function _hexRgba(hex, a) {
      hex = hex.replace('#','');
      if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
      return 'rgba('+parseInt(hex.slice(0,2),16)+','+parseInt(hex.slice(2,4),16)+','+parseInt(hex.slice(4,6),16)+','+a+')';
    }

    function _drawAnn(ctx, ann) {
      ctx.save();
      if (ann.t === 'freehand') {
        ctx.strokeStyle = ann.c; ctx.lineWidth = ann.sw;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath();
        ann.p.forEach(function(pt, i) { i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y); });
        ctx.stroke();
      } else if (ann.t === 'highlight') {
        ctx.fillStyle = _hexRgba(ann.c, 0.35);
        ctx.fillRect(ann.x, ann.y, ann.w, ann.h);
      } else if (ann.t === 'rect') {
        ctx.strokeStyle = ann.c; ctx.lineWidth = ann.sw; ctx.strokeRect(ann.x, ann.y, ann.w, ann.h);
      } else if (ann.t === 'ellipse') {
        ctx.strokeStyle = ann.c; ctx.lineWidth = ann.sw;
        ctx.beginPath();
        ctx.ellipse(ann.x+ann.w/2, ann.y+ann.h/2, Math.max(1,Math.abs(ann.w/2)), Math.max(1,Math.abs(ann.h/2)), 0, 0, 2*Math.PI);
        ctx.stroke();
      } else if (ann.t === 'arrow' || ann.t === 'line') {
        ctx.strokeStyle = ann.c; ctx.lineWidth = ann.sw;
        var dx=ann.x2-ann.x1, dy=ann.y2-ann.y1;
        var angle=Math.atan2(dy,dx), len=Math.sqrt(dx*dx+dy*dy), hl=Math.min(20,len*0.35);
        ctx.beginPath();
        ctx.moveTo(ann.x1,ann.y1); ctx.lineTo(ann.x2,ann.y2);
        if (ann.t === 'arrow' && len > 10) {
          ctx.lineTo(ann.x2-hl*Math.cos(angle-Math.PI/6), ann.y2-hl*Math.sin(angle-Math.PI/6));
          ctx.moveTo(ann.x2,ann.y2);
          ctx.lineTo(ann.x2-hl*Math.cos(angle+Math.PI/6), ann.y2-hl*Math.sin(angle+Math.PI/6));
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    function _redrawPage(pageNum) {
      var ac = __pageCanvases[pageNum];
      if (!ac) return;
      var ctx = ac.getContext('2d');
      ctx.clearRect(0, 0, ac.width, ac.height);
      (window.__annotations[pageNum] || []).forEach(function(ann) { _drawAnn(ctx, ann); });
    }

    function _drawPreview(ac, sp, cp, pts) {
      _redrawPage(+ac.dataset.page);
      var ctx = ac.getContext('2d');
      ctx.save();
      ctx.strokeStyle = __drawColor; ctx.lineWidth = __strokeWidth;
      if (__drawTool === 'freehand') {
        ctx.lineCap='round'; ctx.lineJoin='round';
        ctx.beginPath();
        pts.forEach(function(p,i){ i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y); });
        ctx.stroke();
      } else if (__drawTool === 'highlight') {
        ctx.fillStyle = _hexRgba(__drawColor, 0.35);
        ctx.fillRect(Math.min(sp.x,cp.x),Math.min(sp.y,cp.y),Math.abs(cp.x-sp.x),Math.abs(cp.y-sp.y));
      } else if (__drawTool === 'rect') {
        ctx.strokeRect(Math.min(sp.x,cp.x),Math.min(sp.y,cp.y),Math.abs(cp.x-sp.x),Math.abs(cp.y-sp.y));
      } else if (__drawTool === 'ellipse') {
        var cx=(sp.x+cp.x)/2, cy=(sp.y+cp.y)/2;
        var rx=Math.max(1,Math.abs(cp.x-sp.x)/2), ry=Math.max(1,Math.abs(cp.y-sp.y)/2);
        ctx.beginPath(); ctx.ellipse(cx,cy,rx,ry,0,0,2*Math.PI); ctx.stroke();
      } else if (__drawTool === 'arrow' || __drawTool === 'line') {
        var dx=cp.x-sp.x, dy=cp.y-sp.y;
        var angle=Math.atan2(dy,dx), len=Math.sqrt(dx*dx+dy*dy), hl=Math.min(20,len*0.35);
        ctx.beginPath(); ctx.moveTo(sp.x,sp.y); ctx.lineTo(cp.x,cp.y);
        if (__drawTool === 'arrow' && len > 10) {
          ctx.lineTo(cp.x-hl*Math.cos(angle-Math.PI/6),cp.y-hl*Math.sin(angle-Math.PI/6));
          ctx.moveTo(cp.x,cp.y);
          ctx.lineTo(cp.x-hl*Math.cos(angle+Math.PI/6),cp.y-hl*Math.sin(angle+Math.PI/6));
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    // ─── Per-page annotation canvas setup ─────────────────────────────────
    function _setupAnnotCanvas(pageNum, refCanvas, wrapper) {
      var ac = document.createElement('canvas');
      ac.dataset.page = String(pageNum);
      ac.width  = refCanvas.width;
      ac.height = refCanvas.height;
      ac.className = 'annot-layer';
      ac.style.width  = refCanvas.style.width;
      ac.style.height = refCanvas.style.height;
      wrapper.appendChild(ac);
      __pageCanvases[pageNum] = ac;
      if (!window.__annotations[pageNum]) window.__annotations[pageNum] = [];

      var isDown=false, pts=[], sp=null;

      function _pos(e) {
        var rect=ac.getBoundingClientRect();
        var src=e.touches?e.touches[0]:e;
        var sx=ac.width/rect.width, sy=ac.height/rect.height;
        return { x:(src.clientX-rect.left)*sx, y:(src.clientY-rect.top)*sy };
      }
      function onStart(e) {
        if (__drawTool==='none') return;
        e.preventDefault(); e.stopPropagation();
        isDown=true; var p=_pos(e); pts=[p]; sp=p;
      }
      function onMove(e) {
        if (!isDown||__drawTool==='none') return;
        e.preventDefault(); e.stopPropagation();
        var p=_pos(e); pts.push(p); _drawPreview(ac,sp,p,pts);
      }
      function onEnd(e) {
        if (!isDown) return; isDown=false;
        if (pts.length<2){pts=[];return;}
        var ep=pts[pts.length-1], ann=null;
        if (__drawTool==='freehand') {
          ann={t:'freehand',p:pts.map(function(q){return{x:Math.round(q.x),y:Math.round(q.y)};}),c:__drawColor,sw:__strokeWidth,cw:ac.width,ch:ac.height};
        } else if (__drawTool==='highlight') {
          ann={t:'highlight',x:Math.round(Math.min(sp.x,ep.x)),y:Math.round(Math.min(sp.y,ep.y)),w:Math.round(Math.abs(ep.x-sp.x)),h:Math.round(Math.abs(ep.y-sp.y)),c:__drawColor,cw:ac.width,ch:ac.height};
        } else if (__drawTool==='rect') {
          ann={t:'rect',x:Math.round(Math.min(sp.x,ep.x)),y:Math.round(Math.min(sp.y,ep.y)),w:Math.round(Math.abs(ep.x-sp.x)),h:Math.round(Math.abs(ep.y-sp.y)),c:__drawColor,sw:__strokeWidth,cw:ac.width,ch:ac.height};
        } else if (__drawTool==='ellipse') {
          ann={t:'ellipse',x:Math.round(Math.min(sp.x,ep.x)),y:Math.round(Math.min(sp.y,ep.y)),w:Math.round(Math.abs(ep.x-sp.x)),h:Math.round(Math.abs(ep.y-sp.y)),c:__drawColor,sw:__strokeWidth,cw:ac.width,ch:ac.height};
        } else if (__drawTool==='arrow'||__drawTool==='line') {
          ann={t:__drawTool,x1:Math.round(sp.x),y1:Math.round(sp.y),x2:Math.round(ep.x),y2:Math.round(ep.y),c:__drawColor,sw:__strokeWidth,cw:ac.width,ch:ac.height};
        } else if (__drawTool==='eraser') {
          window.__annotations[pageNum]=window.__annotations[pageNum].filter(function(a){
            var cx,cy;
            if(a.t==='freehand'&&a.p.length>0){cx=a.p[0].x;cy=a.p[0].y;}
            else if(a.t==='rect'||a.t==='highlight'||a.t==='ellipse'){cx=a.x+a.w/2;cy=a.y+a.h/2;}
            else{cx=(a.x1+a.x2)/2;cy=(a.y1+a.y2)/2;}
            return !pts.some(function(q){return Math.sqrt((q.x-cx)*(q.x-cx)+(q.y-cy)*(q.y-cy))<40;});
          });
          pts=[]; _redrawPage(pageNum); return;
        }
        if (ann) window.__annotations[pageNum].push(ann);
        _redrawPage(pageNum); pts=[];
      }

      ac.addEventListener('touchstart', onStart, {passive:false});
      ac.addEventListener('touchmove',  onMove,  {passive:false});
      ac.addEventListener('touchend',   onEnd,   false);
      ac.addEventListener('mousedown',  onStart, false);
      window.addEventListener('mousemove', function(e){ if(isDown) onMove(e); }, false);
      window.addEventListener('mouseup',   function(e){ if(isDown) onEnd(e);  }, false);
    }

    // ─── PDF.js Rendering ──────────────────────────────────────────────────
    (function() {
      var b64='${base64}';
      var bStr=atob(b64);
      var bytes=new Uint8Array(bStr.length);
      for(var i=0;i<bStr.length;i++) bytes[i]=bStr.charCodeAt(i);

      pdfjsLib.getDocument({data:bytes}).promise.then(function(pdf) {
        document.getElementById('status').style.display='none';
        var total=pdf.numPages;
        post({type:'pages',count:total});
        var container=document.getElementById('container');
        var deviceWidth=window.innerWidth;

        for(var n=1;n<=total;n++){
          (function(pageNum){
            pdf.getPage(pageNum).then(function(page){
              var unscaled=page.getViewport({scale:1});
              var scale=deviceWidth/unscaled.width;
              var viewport=page.getViewport({scale:scale});

              var canvas=document.createElement('canvas');
              canvas.className='pdf-page';
              canvas.width=viewport.width;
              canvas.height=viewport.height;
              canvas.style.width=viewport.width+'px';
              canvas.style.height=viewport.height+'px';
              canvas.id='page-'+pageNum;

              var wrap=document.createElement('div');
              wrap.className='page-wrap';
              wrap.style.width=viewport.width+'px';
              wrap.style.height=viewport.height+'px';
              wrap.appendChild(canvas);
              container.appendChild(wrap);

              page.render({canvasContext:canvas.getContext('2d'),viewport:viewport}).promise.then(function(){
                _setupAnnotCanvas(pageNum, canvas, wrap);
                post({type:'rendered',page:pageNum});
              });
            });
          })(n);
        }
      }).catch(function(err){
        document.getElementById('status').style.display='none';
        var el=document.getElementById('error');
        el.style.display='block';
        el.textContent='Could not render PDF: '+err.message;
        post({type:'error',message:err.message});
      });
    })();
  </script>
</body>
</html>`;
}

// ─── Map RN tool → WebView draw tool ────────────────────────────────────────

function toWebTool(
  tool: ToolType,
  shapeType: "rectangle" | "circle" | "arrow" | "line"
): string {
  switch (tool) {
    case "draw":      return "freehand";
    case "highlight": return "highlight";
    case "eraser":    return "eraser";
    case "shape": {
      switch (shapeType) {
        case "rectangle": return "rect";
        case "circle":    return "ellipse";
        case "arrow":     return "arrow";
        case "line":      return "line";
      }
      return "rect";
    }
    default: return "none";
  }
}

const DRAWING_TOOLS: ToolType[] = ["draw", "highlight", "shape", "eraser"];

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function ViewerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const fileName = (params.fileName as string) || "Document.pdf";
  const fileUri  = (params.fileUri  as string) || "";

  // PDF state
  const [pdfHtml,    setPdfHtml]    = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError,   setPdfError]   = useState("");
  const [totalPages, setTotalPages] = useState<number | null>(null);

  // UI state
  const [activeTool,  setActiveTool]  = useState<ToolType>("select");
  const [color,       setColor]       = useState("#EF4444");
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [shapeType,   setShapeType]   = useState<"rectangle" | "circle" | "arrow" | "line">("rectangle");
  const [showSearch,  setShowSearch]  = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [bookmarked,  setBookmarked]  = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Annotation apply state
  const [isApplying, setIsApplying] = useState(false);
  const waitingForAnnotations = useRef(false);

  // WebView ref — used for injectJavaScript
  const webViewRef = useRef<WebView>(null);

  // Text annotation modal
  const [showTextModal, setShowTextModal] = useState(false);
  const [annotText,     setAnnotText]     = useState("");
  const [annotPage,     setAnnotPage]     = useState("1");
  const [annotWorking,  setAnnotWorking]  = useState(false);

  // ─── Check bookmark status on mount ───────────────────────────────────────

  useEffect(() => {
    if (!fileUri) return;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(BOOKMARKS_KEY);
        const list: Array<{ fileUri: string }> = stored ? JSON.parse(stored) : [];
        setBookmarked(list.some((b) => b.fileUri === fileUri));
      } catch {}
    })();
  }, [fileUri]);

  // ─── Load PDF ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!fileUri || Platform.OS === "web") return;
    loadPdf();
  }, [fileUri]);

  const loadPdf = useCallback(async () => {
    setPdfLoading(true);
    setPdfError("");
    try {
      const info = await FileSystem.getInfoAsync(fileUri);
      if (!info.exists) {
        setPdfError("File not found. It may have been moved or deleted.");
        return;
      }
      const base64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      setPdfHtml(buildPdfHtml(base64));
    } catch (e: any) {
      setPdfError(e?.message || "Failed to load the PDF file.");
    } finally {
      setPdfLoading(false);
    }
  }, [fileUri]);

  // ─── Sync tool/color/stroke to WebView whenever they change ──────────────

  useEffect(() => {
    if (!webViewRef.current || !pdfHtml) return;
    const wt = toWebTool(activeTool, shapeType);
    webViewRef.current.injectJavaScript(
      `window.setAnnotationTool(${JSON.stringify(wt)},${JSON.stringify(color)},${strokeWidth}); true;`
    );
  }, [activeTool, shapeType, pdfHtml]);

  useEffect(() => {
    if (!webViewRef.current || !pdfHtml) return;
    webViewRef.current.injectJavaScript(
      `window.setAnnotationColor(${JSON.stringify(color)}); true;`
    );
  }, [color, pdfHtml]);

  useEffect(() => {
    if (!webViewRef.current || !pdfHtml) return;
    webViewRef.current.injectJavaScript(
      `window.setAnnotationStrokeWidth(${strokeWidth}); true;`
    );
  }, [strokeWidth, pdfHtml]);

  // ─── WebView message handler ──────────────────────────────────────────────

  const handleWebViewMessage = useCallback(
    (event: any) => {
      try {
        const msg = JSON.parse(event.nativeEvent.data);
        if (msg.type === "pages") setTotalPages(msg.count);
        if (msg.type === "error") setPdfError(msg.message);

        // Annotation data returned after "Apply" was tapped
        if (msg.type === "annotations" && waitingForAnnotations.current) {
          waitingForAnnotations.current = false;
          (async () => {
            try {
              const annotsByPage: Record<string, any[]> = JSON.parse(
                typeof msg.data === "string" ? msg.data : "{}"
              );
              const hasAnns = Object.values(annotsByPage).some(
                (a) => Array.isArray(a) && a.length > 0
              );
              if (!hasAnns) {
                Alert.alert(
                  "Nothing drawn",
                  "Draw on the PDF before tapping Apply."
                );
                setIsApplying(false);
                return;
              }
              const outName = "annotated_" + fileName;
              await embedAnnotationsToPdf(fileUri, annotsByPage, outName);
              // Clear canvas overlays after saving
              webViewRef.current?.injectJavaScript(
                "window.clearAllAnnotations(); true;"
              );
              setActiveTool("select");
              if (Platform.OS !== "web")
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Success
                );
            } catch (e: any) {
              Alert.alert("Error", e?.message || "Failed to embed annotations.");
            } finally {
              setIsApplying(false);
            }
          })();
        }
      } catch (_) {}
    },
    [fileUri, fileName]
  );

  // ─── Drawing action bar handlers ──────────────────────────────────────────

  const handleApplyAnnotations = () => {
    if (!webViewRef.current || !fileUri) return;
    setIsApplying(true);
    waitingForAnnotations.current = true;
    webViewRef.current.injectJavaScript(
      `(function(){ post({ type:'annotations', data: JSON.stringify(window.__annotations||{}) }); })(); true;`
    );
  };

  const handleUndoAnnotation = () => {
    webViewRef.current?.injectJavaScript("window.undoLastAnnotation(); true;");
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleCancelDrawing = () => {
    webViewRef.current?.injectJavaScript("window.clearAllAnnotations(); true;");
    setActiveTool("select");
  };

  // ─── Other handlers ───────────────────────────────────────────────────────

  const toggleBookmark = async () => {
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const stored = await AsyncStorage.getItem(BOOKMARKS_KEY);
      const list: Array<{ id: string; fileUri: string; fileName: string; date: string }> =
        stored ? JSON.parse(stored) : [];
      const exists = list.some((b) => b.fileUri === fileUri);
      let updated: typeof list;
      if (exists) {
        updated = list.filter((b) => b.fileUri !== fileUri);
      } else {
        updated = [
          {
            id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
            fileUri,
            fileName,
            date: new Date().toISOString(),
          },
          ...list,
        ];
      }
      await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updated));
      setBookmarked(!exists);
    } catch {}
  };

  const handleSaveDoc = async () => {
    setShowMoreMenu(false);
    if (!fileUri) {
      Alert.alert("No File", "No PDF is currently open.");
      return;
    }
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await shareExistingPdf(fileUri, fileName);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not share the file.");
    }
  };

  const handleToolSelect = (tool: ToolType) => {
    setActiveTool(tool);

    if ((tool === "text" || tool === "comment") && fileUri) {
      setAnnotText("");
      setAnnotPage("1");
      setShowTextModal(true);
      setActiveTool(tool);
      return;
    }

    if (tool === "sign" && fileUri) {
      router.push({ pathname: "/sign", params: { fileUri, fileName } });
      setActiveTool("select");
      return;
    }
  };

  const handleAddAnnotation = async () => {
    if (!annotText.trim()) {
      Alert.alert("Empty Text", "Please enter some text.");
      return;
    }
    if (!fileUri) return;
    setAnnotWorking(true);
    try {
      const pageIdx = Math.max(0, (parseInt(annotPage) || 1) - 1);
      const outName = "annotated_" + fileName;
      await addTextAnnotation(fileUri, annotText.trim(), pageIdx, {}, outName);
      setShowTextModal(false);
      setActiveTool("select");
      if (Platform.OS !== "web")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to add annotation.");
    } finally {
      setAnnotWorking(false);
    }
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const isDrawingMode = DRAWING_TOOLS.includes(activeTool) && !!pdfHtml;

  // ─── Render PDF area ──────────────────────────────────────────────────────

  const renderPdfArea = () => {
    if (Platform.OS === "web") {
      return (
        <View style={styles.centerBox}>
          <Ionicons name="document-text-outline" size={56} color={Colors.dark.border} />
          <Text style={styles.centerText}>Open the app on your phone to view PDFs</Text>
        </View>
      );
    }

    if (!fileUri) {
      return (
        <View style={styles.centerBox}>
          <Ionicons name="document-outline" size={56} color={Colors.dark.border} />
          <Text style={styles.centerText}>No file selected</Text>
        </View>
      );
    }

    if (pdfLoading) {
      return (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={Colors.dark.accent} />
          <Text style={[styles.centerText, { marginTop: 16 }]}>Loading PDF…</Text>
        </View>
      );
    }

    if (pdfError) {
      return (
        <View style={styles.centerBox}>
          <Ionicons name="alert-circle-outline" size={48} color="#F87171" />
          <Text style={[styles.centerText, { color: "#F87171", marginTop: 12 }]}>{pdfError}</Text>
          <Pressable style={styles.retryBtn} onPress={loadPdf}>
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </View>
      );
    }

    if (pdfHtml) {
      return (
        <WebView
          ref={webViewRef}
          style={styles.webView}
          source={{ html: pdfHtml, baseUrl: "" }}
          originWhitelist={["*"]}
          javaScriptEnabled
          allowFileAccess
          allowFileAccessFromFileURLs
          allowUniversalAccessFromFileURLs
          onMessage={handleWebViewMessage}
          scrollEnabled={!isDrawingMode}
          showsVerticalScrollIndicator
          onError={(e) => setPdfError("WebView error: " + e.nativeEvent.description)}
        />
      );
    }

    return null;
  };

  // ─── JSX ─────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark.textPrimary} />
        </Pressable>

        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>{fileName}</Text>
          {totalPages !== null && (
            <Text style={styles.pageIndicator}>
              {totalPages} page{totalPages !== 1 ? "s" : ""}
            </Text>
          )}
        </View>

        <Pressable onPress={() => setShowSearch((v) => !v)} style={styles.iconBtn}>
          <Ionicons name="search" size={20} color={Colors.dark.textPrimary} />
        </Pressable>

        <Pressable onPress={toggleBookmark} style={styles.iconBtn}>
          <Ionicons
            name={bookmarked ? "bookmark" : "bookmark-outline"}
            size={20}
            color={bookmarked ? Colors.dark.accent : Colors.dark.textPrimary}
          />
        </Pressable>

        <Pressable onPress={() => setShowMoreMenu(true)} style={styles.iconBtn}>
          <Ionicons name="ellipsis-vertical" size={24} color={Colors.dark.textPrimary} />
        </Pressable>
      </View>

      {/* Search bar */}
      {showSearch && (
        <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.searchBar}>
          <Ionicons name="search" size={18} color={Colors.dark.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search in document…"
            placeholderTextColor={Colors.dark.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            returnKeyType="search"
          />
          <Pressable onPress={() => { setShowSearch(false); setSearchQuery(""); }}>
            <Ionicons name="close" size={18} color={Colors.dark.textSecondary} />
          </Pressable>
        </Animated.View>
      )}

      {/* Main PDF area */}
      <View style={styles.pdfArea}>
        {renderPdfArea()}

        {/* ── Drawing action bar (shown when draw/highlight/shape/erase is active) ── */}
        {isDrawingMode && (
          <Animated.View entering={SlideInDown} exiting={SlideOutDown} style={styles.drawBar}>
            <Pressable style={styles.drawBarCancel} onPress={handleCancelDrawing}>
              <Ionicons name="close" size={18} color={Colors.dark.textSecondary} />
              <Text style={styles.drawBarCancelText}>Cancel</Text>
            </Pressable>

            <View style={styles.drawBarCenter}>
              <Text style={styles.drawBarLabel}>
                {activeTool === "draw"      ? "Draw freely"  :
                 activeTool === "highlight" ? "Highlight"    :
                 activeTool === "eraser"    ? "Erase"        :
                 shapeType.charAt(0).toUpperCase() + shapeType.slice(1)}
              </Text>
            </View>

            <View style={styles.drawBarRight}>
              <Pressable style={styles.drawBarUndoBtn} onPress={handleUndoAnnotation}>
                <Ionicons name="arrow-undo" size={18} color={Colors.dark.textPrimary} />
              </Pressable>
              <Pressable
                style={[styles.drawBarApplyBtn, isApplying && { opacity: 0.5 }]}
                onPress={handleApplyAnnotations}
                disabled={isApplying}
              >
                {isApplying ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={16} color="#FFF" />
                    <Text style={styles.drawBarApplyText}>Apply</Text>
                  </>
                )}
              </Pressable>
            </View>
          </Animated.View>
        )}
      </View>

      {/* Context toolbar (color/stroke pickers) */}
      <ContextToolbar
        activeTool={activeTool}
        color={color}
        onColorChange={setColor}
        strokeWidth={strokeWidth}
        onStrokeWidthChange={setStrokeWidth}
        shapeType={shapeType}
        onShapeTypeChange={setShapeType}
      />

      <ToolBar activeTool={activeTool} onSelectTool={handleToolSelect} />

      {/* ─── Text / Comment Annotation Modal ─────────────────────────────── */}
      <Modal visible={showTextModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Animated.View
            entering={SlideInDown}
            exiting={SlideOutDown}
            style={[styles.textModal, { paddingBottom: Math.max(insets.bottom, 24) }]}
          >
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Add Text to PDF</Text>
            <Text style={styles.sheetSub}>
              The text will be embedded permanently into the PDF page.
            </Text>

            <TextInput
              style={styles.annotInput}
              placeholder="Type your text here…"
              placeholderTextColor={Colors.dark.textSecondary}
              value={annotText}
              onChangeText={setAnnotText}
              multiline
              numberOfLines={3}
              autoFocus
            />

            <View style={styles.pageRow}>
              <Text style={styles.pageLabel}>Page number:</Text>
              <TextInput
                style={styles.pageInput}
                value={annotPage}
                onChangeText={setAnnotPage}
                keyboardType="number-pad"
                maxLength={4}
                placeholder="1"
                placeholderTextColor={Colors.dark.textSecondary}
              />
              {totalPages !== null && (
                <Text style={styles.pageHint}>of {totalPages}</Text>
              )}
            </View>

            <View style={styles.annotFooter}>
              <Pressable
                style={styles.annotCancelBtn}
                onPress={() => { setShowTextModal(false); setActiveTool("select"); }}
              >
                <Text style={styles.annotCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.annotSaveBtn, (!annotText.trim() || annotWorking) && { opacity: 0.45 }]}
                onPress={handleAddAnnotation}
                disabled={!annotText.trim() || annotWorking}
              >
                {annotWorking ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.annotSaveText}>Add to PDF</Text>
                )}
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* ─── More options sheet ─────────────────────────────────────────── */}
      <Modal visible={showMoreMenu} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowMoreMenu(false)}>
          <Animated.View
            entering={SlideInDown}
            exiting={SlideOutDown}
            style={[styles.actionSheet, { paddingBottom: Math.max(insets.bottom, 24) }]}
          >
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Document Options</Text>

            <Pressable style={styles.sheetAction} onPress={handleSaveDoc}>
              <Ionicons name="share-outline" size={22} color={Colors.dark.textPrimary} />
              <Text style={styles.sheetActionText}>Save / Share Document</Text>
            </Pressable>

            <Pressable style={styles.sheetAction} onPress={() => {
              setShowMoreMenu(false);
              router.push({ pathname: "/protect", params: { fileUri, fileName } });
            }}>
              <Ionicons name="lock-closed-outline" size={22} color={Colors.dark.textPrimary} />
              <Text style={styles.sheetActionText}>Add Password / Restrict</Text>
            </Pressable>

            <Pressable style={styles.sheetAction} onPress={() => {
              setShowMoreMenu(false);
              router.push({ pathname: "/watermark", params: { fileUri, fileName } });
            }}>
              <Ionicons name="water-outline" size={22} color={Colors.dark.textPrimary} />
              <Text style={styles.sheetActionText}>Add Watermark</Text>
            </Pressable>

            <Pressable style={styles.sheetAction} onPress={() => {
              setShowMoreMenu(false);
              router.push({ pathname: "/sign", params: { fileUri, fileName } });
            }}>
              <Ionicons name="create-outline" size={22} color={Colors.dark.textPrimary} />
              <Text style={styles.sheetActionText}>Sign Document</Text>
            </Pressable>

            <Pressable style={styles.sheetAction} onPress={() => {
              setShowMoreMenu(false);
              setAnnotText(""); setAnnotPage("1"); setShowTextModal(true);
            }}>
              <Ionicons name="text" size={22} color={Colors.dark.textPrimary} />
              <Text style={styles.sheetActionText}>Add Text Annotation</Text>
            </Pressable>

            <Pressable style={styles.sheetAction} onPress={() => {
              setShowMoreMenu(false);
              router.push("/bookmarks");
            }}>
              <Ionicons name="bookmarks-outline" size={22} color={Colors.dark.textPrimary} />
              <Text style={styles.sheetActionText}>Bookmarks</Text>
            </Pressable>

            <Pressable
              style={[styles.sheetAction, { borderTopWidth: 1, borderTopColor: Colors.dark.border, marginTop: 8, paddingTop: 16 }]}
              onPress={() => { setShowMoreMenu(false); router.back(); }}
            >
              <Ionicons name="close-circle-outline" size={22} color={Colors.dark.warning} />
              <Text style={[styles.sheetActionText, { color: Colors.dark.warning }]}>Close Document</Text>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
    gap: 4,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  titleContainer: {
    flex: 1,
    paddingHorizontal: 4,
  },
  title: {
    color: Colors.dark.textPrimary,
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  pageIndicator: {
    color: Colors.dark.textSecondary,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginTop: 2,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.surface,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  searchInput: {
    flex: 1,
    color: Colors.dark.textPrimary,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  pdfArea: {
    flex: 1,
    position: "relative",
  },
  webView: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    gap: 16,
  },
  centerText: {
    color: Colors.dark.textSecondary,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    textAlign: "center",
  },
  retryBtn: {
    backgroundColor: Colors.dark.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  retryText: {
    color: "#FFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },

  // Drawing action bar
  drawBar: {
    position: "absolute",
    bottom: 8,
    left: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.surface2,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
    gap: 8,
  },
  drawBarCancel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.dark.surface,
  },
  drawBarCancelText: {
    color: Colors.dark.textSecondary,
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  drawBarCenter: {
    flex: 1,
    alignItems: "center",
  },
  drawBarLabel: {
    color: Colors.dark.textPrimary,
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  drawBarRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  drawBarUndoBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.dark.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  drawBarApplyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.dark.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  drawBarApplyText: {
    color: "#FFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  textModal: {
    backgroundColor: Colors.dark.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 16,
    borderTopWidth: 1,
    borderColor: Colors.dark.border,
  },
  actionSheet: {
    backgroundColor: Colors.dark.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 4,
    borderTopWidth: 1,
    borderColor: Colors.dark.border,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.dark.border,
    alignSelf: "center",
    marginBottom: 8,
  },
  sheetTitle: {
    color: Colors.dark.textPrimary,
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    marginBottom: 4,
  },
  sheetSub: {
    color: Colors.dark.textSecondary,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
  },
  sheetAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  sheetActionText: {
    color: Colors.dark.textPrimary,
    fontFamily: "Inter_500Medium",
    fontSize: 15,
  },
  annotInput: {
    backgroundColor: Colors.dark.surface2,
    borderRadius: 12,
    padding: 14,
    color: Colors.dark.textPrimary,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    minHeight: 90,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  pageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pageLabel: {
    color: Colors.dark.textSecondary,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  pageInput: {
    backgroundColor: Colors.dark.surface2,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: Colors.dark.textPrimary,
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    width: 60,
    textAlign: "center",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  pageHint: {
    color: Colors.dark.textSecondary,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
  annotFooter: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  annotCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.dark.surface2,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  annotCancelText: {
    color: Colors.dark.textSecondary,
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  annotSaveBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.dark.accent,
    alignItems: "center",
  },
  annotSaveText: {
    color: "#FFF",
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
});
