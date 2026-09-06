import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  X,
  Sparkles,
  Send,
  RefreshCw,
  CheckCircle,
  HelpCircle,
  Image as ImageIcon,
  MessageSquare,
  Lightbulb,
  SwitchCamera,
  RotateCcw,
  ScanLine,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SubjectType, GradeType, AIQuestionResult, ProblemItem, CommunityQuestion } from '../types';
import { dbSaveQnaQuestion } from '../services/dbService';

interface AskQuestionModalProps {
  initialProblem?: ProblemItem | null;
  onClose: () => void;
  onSaveToHistory: (result: AIQuestionResult) => void;
  onPostToCommunity?: (question: CommunityQuestion) => void;
  userProfile?: { nickname: string; schoolName: string; grade: GradeType; id?: string; role: 'student' | 'admin' };
}

export const AskQuestionModal: React.FC<AskQuestionModalProps> = ({
  initialProblem,
  onClose,
  onSaveToHistory,
  onPostToCommunity,
  userProfile,
}) => {
  const [subject, setSubject] = useState<SubjectType>(initialProblem?.subject || 'math');
  const [grade, setGrade] = useState<GradeType>(initialProblem?.grade || 'high_1');
  const [questionText, setQuestionText] = useState(
    initialProblem
      ? `[${initialProblem.chapter}] ${initialProblem.unitName} - ${initialProblem.problemNumber}\n${initialProblem.problemText}`
      : ''
  );
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/jpeg');

  // Camera stream state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCameraStarting, setIsCameraStarting] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isFlashing, setIsFlashing] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);

  // Loading & Result state
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<AIQuestionResult | null>(null);

  // Follow-up chat state
  const [followUpText, setFollowUpText] = useState('');
  const [isFollowUpLoading, setIsFollowUpLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<Array<{ sender: 'user' | 'assistant'; text: string; time: string }>>([]);
  const [hasPostedToCommunity, setHasPostedToCommunity] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop camera when unmounting or modal closes
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Ensure video element gets stream attached once rendered
  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current
        .play()
        .catch((err) => console.warn('Video playback warning:', err));
    }
  }, [isCameraActive]);

  const startCamera = async (targetFacingMode: 'environment' | 'user' = facingMode) => {
    setIsCameraStarting(true);
    setErrorMsg(null);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: targetFacingMode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
      } catch (firstErr) {
        console.warn('Fallback to basic video constraint:', firstErr);
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;
      setIsCameraActive(true);
      setFacingMode(targetFacingMode);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((e) => console.warn('Play error:', e));
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setIsCameraActive(false);
      setErrorMsg(
        '카메라 권한을 확인해주세요. (브라우저 설정에서 카메라 권한을 허용하거나 스마트폰 기본 카메라 앱으로 촬영할 수 있습니다.)'
      );
    } finally {
  setIsCameraStarting(false);
}
  };

  const toggleFacingMode = async () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    await startCamera(nextMode);
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
    setIsCameraStarting(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;

    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 200);

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      setImagePreview(dataUrl);
      setMimeType('image/jpeg');
    }
    stopCamera();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMimeType(file.type || 'image/jpeg');
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    setMimeType(file.type || 'image/jpeg');
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitQuestion = async () => {
    if (!imagePreview && !questionText.trim()) {
      setErrorMsg('문제 사진을 촬영/업로드하거나 문제 내용을 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/solve-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imagePreview,
          mimeType,
          questionText: questionText.trim(),
          subject: subject === 'math' ? '수학' : '과학',
          grade: grade === 'high_1' ? '고등학교 1학년' : '고등학교',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '오류가 발생했습니다.');
      }

      const parsed = data.data;
      const newResult: AIQuestionResult = {
        id: `ai-q-${Date.now()}`,
        createdAt: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        subject: subject === 'math' ? '수학' : '과학',
        problemTitle: parsed.problemTitle || '질문한 문제 풀이',
        extractedProblemText: parsed.extractedProblemText || questionText || '사진 속 문제',
        summary: parsed.summary || '문제 핵심 분석',
        steps: parsed.steps || [],
        finalAnswer: parsed.finalAnswer || '',
        dreamTip: parsed.dreamTip || '핵심 원리를 기억하고 단계별로 풀어보세요!',
        keyConcepts: parsed.keyConcepts || [],
        userImage: imagePreview || undefined,
        userQuestion: questionText || undefined,
        chatHistory: [],
      };

      setResult(newResult);
      onSaveToHistory(newResult);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || '네트워크 상태를 확인해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpText.trim() || !result || isFollowUpLoading) return;

    const userQ = followUpText.trim();
    setFollowUpText('');

    const newChat = [
      ...chatHistory,
      { sender: 'user' as const, text: userQ, time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) },
    ];
    setChatHistory(newChat);
    setIsFollowUpLoading(true);

    try {
      const res = await fetch('/api/ask-followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemContext: {
            problemTitle: result.problemTitle,
            extractedProblemText: result.extractedProblemText,
            finalAnswer: result.finalAnswer,
          },
          userQuestion: userQ,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '답변을 불러오지 못했습니다.');
      }

      setChatHistory([
        ...newChat,
        {
          sender: 'assistant' as const,
          text: data.answer,
          time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err: any) {
      setChatHistory([
        ...newChat,
        {
          sender: 'assistant' as const,
          text: '잠시 오류가 발생했어요. 다시 질문해주세요!',
          time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsFollowUpLoading(false);
    }
  };

  return (
    <motion.div
      id="ask-question-fullscreen-view"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 15 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 bg-[#FBF9F5] flex flex-col w-full h-full overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 sm:px-8 py-3.5 bg-gradient-to-r from-amber-500 via-amber-400 to-orange-400 text-white flex items-center justify-between shadow-md shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-white/20 hover:bg-white/30 active:scale-95 text-white font-black text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-xs"
            title="뒤로가기"
          >
            <ArrowLeft className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            <span className="hidden sm:inline">뒤로가기</span>
          </button>

          <div className="h-6 w-[1px] bg-white/30 hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className="text-xl">📸</span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                  모르는 문제가 있어요!
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-white/25 text-[11px] font-bold">
                  맞춤 해결
                </span>
              </div>
              <p className="text-[11px] text-amber-100 font-medium hidden sm:block">
                사진을 찍거나 올려주시면 단계별로 풀어드려요!
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all active:scale-95"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body Content */}
      <div className="flex-1 overflow-y-auto w-full p-4 sm:p-6 sm:px-8">
        <div className="max-w-3xl mx-auto space-y-6 pb-12">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
              <span>⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* QUESTION FORM (if not solved yet) */}
          {!result && (
            <div className="space-y-4">
              {/* Subject & Grade Selectors */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1 bg-amber-100/70 p-1 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setSubject('math')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      subject === 'math'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    📐 수학
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubject('science')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      subject === 'science'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🔬 과학
                  </button>
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100/70 border border-amber-300 rounded-xl">
                  <span className="text-xs font-black text-amber-900">
                    🎯 고등학교 1학년 (공통)
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-500 text-white rounded-md">
                    고1 전용 질문
                  </span>
                </div>
              </div>

              {/* Photo Upload & Camera Capture Zone */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  1. 문제 사진 촬영 또는 업로드
                </label>

                {/* Camera Live Stream if active */}
                {isCameraActive ? (
                  <div className="relative rounded-3xl overflow-hidden bg-slate-950 border-2 border-amber-400 aspect-[4/3] flex flex-col items-center justify-between p-3 sm:p-4 shadow-xl">
                    <AnimatePresence>
                      {isFlashing && (
                        <motion.div
                          initial={{ opacity: 0.9 }}
                          animate={{ opacity: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="absolute inset-0 bg-white z-30 pointer-events-none"
                        />
                      )}
                    </AnimatePresence>

                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      onLoadedMetadata={() => {
                        videoRef.current?.play().catch(() => {});
                      }}
                      className={`absolute inset-0 w-full h-full object-cover ${
                        facingMode === 'user' ? 'scale-x-[-1]' : ''
                      }`}
                    />

                    <div className="absolute inset-4 sm:inset-6 pointer-events-none z-10 flex flex-col justify-between">
                      <div className="flex justify-between">
                        <div className="w-6 h-6 border-t-3 border-l-3 border-amber-400 rounded-tl-lg shadow-sm" />
                        <div className="w-6 h-6 border-t-3 border-r-3 border-amber-400 rounded-tr-lg shadow-sm" />
                      </div>

                      <div className="text-center px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-xs text-amber-200 text-[11px] font-bold self-center border border-amber-400/40">
                        📐 문제 지문과 수식을 사각형 안에 맞춰주세요
                      </div>

                      <div className="flex justify-between">
                        <div className="w-6 h-6 border-b-3 border-l-3 border-amber-400 rounded-bl-lg shadow-sm" />
                        <div className="w-6 h-6 border-b-3 border-r-3 border-amber-400 rounded-br-lg shadow-sm" />
                      </div>
                    </div>

                    <div className="relative z-20 w-full flex items-center justify-between">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-xs text-white text-[11px] font-black border border-white/20">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <span>실시간 카메라</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={toggleFacingMode}
                          className="px-2.5 py-1 rounded-full bg-black/60 hover:bg-black/80 text-white text-xs font-bold flex items-center gap-1.5 backdrop-blur-xs border border-white/20 active:scale-95 transition-all"
                          title="전면/후면 카메라 전환"
                        >
                          <SwitchCamera className="w-3.5 h-3.5 text-amber-300" />
                          <span>{facingMode === 'environment' ? '후면' : '전면'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={stopCamera}
                          className="p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-xs border border-white/20"
                          title="카메라 닫기"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="relative z-20 w-full flex items-center justify-center pt-2">
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={capturePhoto}
                          className="w-16 h-16 rounded-full bg-white border-4 border-amber-400 flex items-center justify-center text-amber-600 shadow-2xl hover:scale-105 active:scale-95 transition-all group"
                          title="사진 촬영"
                        >
                          <div className="w-12 h-12 rounded-full bg-amber-500 group-hover:bg-amber-600 flex items-center justify-center text-white transition-colors">
                            <Camera className="w-6 h-6" />
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : imagePreview ? (
                  <div className="relative rounded-2xl overflow-hidden border-2 border-amber-300 bg-white p-3 flex flex-col items-center space-y-3">
                    <div className="relative w-full max-h-64 rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center">
                      <img
                        src={imagePreview}
                        alt="문제 사진"
                        className="max-h-64 object-contain w-full"
                      />
                      <div className="absolute top-2 left-2 px-2.5 py-1 rounded-lg bg-black/70 text-white text-[11px] font-bold backdrop-blur-xs flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        <span>사진 준비 완료</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap justify-center">
                      <button
                        type="button"
                        onClick={() => startCamera()}
                        className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        다시 촬영하기
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors"
                      >
                        다른 사진 선택
                      </button>
                      <button
                        type="button"
                        onClick={() => setImagePreview(null)}
                        className="px-3 py-1.5 bg-rose-100 text-rose-700 rounded-xl text-xs font-bold hover:bg-rose-200 transition-colors"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    className="p-6 border-2 border-dashed border-amber-300 rounded-3xl bg-amber-50/50 hover:bg-amber-50/80 transition-colors flex flex-col items-center justify-center gap-3 text-center"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-3xl border border-amber-200 text-amber-600">
                      📸
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-800">
                        문제 사진을 실시간으로 찍거나 올려주세요
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        사진을 즉시 분석합니다.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap justify-center mt-1">
                      <button
                        type="button"
                        onClick={() => startCamera('environment')}
                        disabled={isCameraStarting}
                        className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-2xl text-xs font-black flex items-center gap-1.5 shadow-md active:scale-95 transition-all disabled:opacity-50"
                      >
                        {isCameraStarting ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>카메라 준비 중...</span>
                          </>
                        ) : (
                          <>
                            <Camera className="w-4 h-4" />
                            <span>실시간 카메라로 촬영</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => nativeCameraInputRef.current?.click()}
                        className="px-3.5 py-2.5 bg-white border-2 border-amber-300 hover:bg-amber-100/60 text-amber-900 rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-xs active:scale-95 transition-all"
                      >
                        <ScanLine className="w-4 h-4 text-amber-600" />
                        <span>기본 카메라 앱 실행</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-xs active:scale-95 transition-all"
                      >
                        <Upload className="w-4 h-4 text-slate-500" />
                        <span>사진 파일 업로드</span>
                      </button>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />

                    <input
                      ref={nativeCameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                )}
              </div>

              {/* Text Input / Formula Area */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>2. 문제 내용 직접 적기 (또는 추가 설명)</span>
                  <span className="text-[11px] text-slate-400 font-normal">선택 사항</span>
                </label>
                <textarea
                  rows={3}
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="예:교과서 p.42 2번 문제 풀이 알려줘! (또는 수식이나 궁금한 점을 적어주세요)"
                  className="w-full p-3 bg-white rounded-2xl border border-amber-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              {/* Mascot cheering banner */}
              <div className="p-3.5 bg-amber-100/60 rounded-2xl border border-amber-200/80 flex items-center gap-3">
                <span className="text-2xl">🐶</span>
                <p className="text-xs text-amber-900 font-semibold leading-snug">
                  "사진이 조금 흐려도 걱정 마! 내가 꼼꼼하게 읽고 친구들이 이해하기 쉽게 단계별로 풀어줄게 ✨"
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="button"
                onClick={handleSubmitQuestion}
                disabled={isLoading}
                className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-2xl font-black text-sm sm:text-base shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 active:scale-98 transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>문제를 꼼꼼히 분석하고 풀이하는 중...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>풀어 DREAM에게 풀이 물어보기!</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* RESULT DISPLAY (When solved!) */}
          {result && (
            <div className="space-y-4">
              <div className="p-4 bg-white rounded-2xl border-2 border-amber-200 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">
                    {result.subject} · {result.problemTitle}
                  </span>
                  <button
                    onClick={() => {
                      setResult(null);
                      setImagePreview(null);
                      setQuestionText('');
                    }}
                    className="text-xs text-amber-700 font-bold hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> 다른 문제 물어보기
                  </button>
                </div>

                <p className="text-xs sm:text-sm text-slate-700 font-medium whitespace-pre-line bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  {result.extractedProblemText}
                </p>

                {result.keyConcepts && result.keyConcepts.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    {result.keyConcepts.map((c, i) => (
                      <span key={i} className="text-[11px] px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-semibold">
                        #{c}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Step-by-Step AI Solution */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  단계별 맞춤 풀이 과정
                </h3>

                {result.steps.map((step) => (
                  <div
                    key={step.stepNumber}
                    className="p-4 bg-white rounded-2xl border border-amber-200/90 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-xl bg-amber-500 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm">
                        {step.stepNumber}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-slate-800 mb-1">
                          {step.title}
                        </h4>
                        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line font-medium">
                          {step.explanation}
                        </p>
                        {step.formulaOrKey && (
                          <div className="mt-2 p-2 bg-amber-50/70 rounded-xl border border-amber-200 text-amber-950 font-mono text-xs font-bold">
                            {step.formulaOrKey}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Final Answer Banner */}
              <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl text-white shadow-md">
                <span className="text-xs font-bold text-blue-200">최종 정답</span>
                <p className="text-base sm:text-lg font-black mt-0.5">{result.finalAnswer}</p>
              </div>

              {/* Mascot Dream Tip */}
              <div className="p-4 bg-amber-50 rounded-2xl border-2 border-amber-300 flex items-start gap-3">
                <span className="text-2xl">🐶</span>
                <div>
                  <div className="text-xs font-black text-amber-800 mb-0.5 flex items-center gap-1">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                    풀어 DREAM 마스코트의 꿀팁 & 실수 방지!
                  </div>
                  <p className="text-amber-900 text-xs sm:text-sm font-medium leading-relaxed">
                    {result.dreamTip}
                  </p>
                </div>
              </div>

              {/* Post to Community Question Board Button for Teacher Verification */}
              {onPostToCommunity && (
                <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border-2 border-amber-300 flex items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">📢</span>
                    <div>
                      <h4 className="text-xs font-black text-amber-950">
                        {hasPostedToCommunity
                          ? '✅ 질문 게시판에 성공적으로 등록되었습니다!'
                          : '선생님께 직접 확인받고 싶으신가요?'}
                      </h4>
                      <p className="text-[11px] text-amber-800 font-medium">
                        {hasPostedToCommunity
                          ? '선생님이 확인 후 맞춤 해설과 피드백을 답변해주실 예정입니다.'
                          : '실시간 질문 게시판에 등록하면 선생님이 확인 후 답변을 달아드립니다.'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={hasPostedToCommunity}
                    onClick={async () => {
                      const authorName = userProfile?.nickname || '화원고열공이';
                      const titleStr = result.problemTitle || '질문한 문제';
                      const contentStr = result.extractedProblemText || result.summary;
                      const imageStr = result.userImage || '';

                      // 1. Supabase DB 영구 저장
                      await dbSaveQnaQuestion({
                        userName: authorName,
                        title: titleStr,
                        content: contentStr,
                        subject: subject,
                        imageUrl: imageStr,
                      });

                      // 2. 화면 상태 및 리액트 콜백 전달
                      const newCommQ: CommunityQuestion = {
                        id: `q-${Date.now()}`,
                        authorId: userProfile?.id || 'student-1',
                        authorName: authorName,
                        authorRole: userProfile?.role || 'student',
                        authorSchool: userProfile?.schoolName || '대구화원고등학교',
                        authorGrade: userProfile?.grade || 'high_1',
                        subject: subject,
                        textbookRef: `${subject === 'math' ? '수학' : '과학'} 교과서 질문`,
                        title: titleStr,
                        content: contentStr,
                        imageUrl: imageStr,
                        createdAt: new Date().toLocaleDateString('ko-KR', {
                          month: 'numeric',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        }),
                        status: 'waiting',
                        likes: 1,
                      };

                      if (onPostToCommunity) {
                        onPostToCommunity(newCommQ);
                      }
                      setHasPostedToCommunity(true);
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black shrink-0 flex items-center gap-1.5 transition-all ${
                      hasPostedToCommunity
                        ? 'bg-emerald-600 text-white'
                        : 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm active:scale-95'
                    }`}
                  >
                    {hasPostedToCommunity ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>등록 완료</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>선생님께 질문 등록</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Interactive Follow-up Chat */}
              <div className="p-4 bg-white rounded-2xl border-2 border-amber-200 shadow-sm space-y-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                  <h4 className="text-xs font-bold text-slate-800">
                    추가로 궁금한 점 물어보기
                  </h4>
                </div>

                {chatHistory.length > 0 && (
                  <div className="space-y-2 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                    {chatHistory.map((msg, i) => (
                      <div
                        key={i}
                        className={`flex flex-col ${
                          msg.sender === 'user' ? 'items-end' : 'items-start'
                        }`}
                      >
                        <div
                          className={`max-w-[85%] p-2.5 rounded-2xl text-xs font-medium ${
                            msg.sender === 'user'
                              ? 'bg-blue-600 text-white rounded-br-none'
                              : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none shadow-sm'
                          }`}
                        >
                          <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>
                        </div>
                        <span className="text-[10px] text-slate-400 mt-0.5 px-1">{msg.time}</span>
                      </div>
                    ))}
                  </div>
                )}

                <form onSubmit={handleSendFollowUp} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="예: 2단계에서 왜 양변에 3을 곱하나요?"
                    value={followUpText}
                    onChange={(e) => setFollowUpText(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <button
                    type="submit"
                    disabled={isFollowUpLoading || !followUpText.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
                  >
                    {isFollowUpLoading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    질문
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
export default AskQuestionModal;