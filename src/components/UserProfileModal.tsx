import React, { useState } from 'react';
import { useModalHistory } from '../utils/navigationHistory';
import {
  User,
  X,
  Bookmark,
  History,
  Award,
  School,
  Check,
  Edit2,
  LogOut,
  ShieldCheck,
  Trash2,
  FileQuestion,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Filter,
  RotateCcw,
  Clock,
  Eye,
  Image as ImageIcon,
  Maximize2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  UserProfile,
  GradeType,
  ProblemItem,
  AIQuestionResult,
  SubjectType,
} from '../types';
import { deleteAccountById } from '../services/authService';

interface UserProfileModalProps {
  userProfile: UserProfile;
  problems: ProblemItem[];
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
  onSelectProblem: (problem: ProblemItem) => void;
  onSelectHistoryQuestion: (q: AIQuestionResult) => void;
  onLogout: () => void;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  userProfile,
  problems,
  onUpdateProfile,
  onSelectProblem,
  onSelectHistoryQuestion,
  onLogout,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'bookmarks' | 'history' | 'edit'>('bookmarks');
  const [nickname, setNickname] = useState(userProfile.nickname);
  const [schoolName, setSchoolName] = useState(userProfile.schoolName);
  const [grade, setGrade] = useState<GradeType>(userProfile.grade);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  useModalHistory(!!zoomImage, () => setZoomImage(null), 'profile-zoom-image');

  const bookmarkedProblems = problems.filter((p) =>
    (userProfile.bookmarkedProblemIds || []).includes(p.id)
  );

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      nickname: nickname.trim() || '홍길동',
      schoolName: schoolName.trim() || '화원고등학교',
      grade,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleRemoveBookmark = (e: React.MouseEvent, problemId: string) => {
    e.stopPropagation();
    const updated = (userProfile.bookmarkedProblemIds || []).filter((id) => id !== problemId);
    onUpdateProfile({ bookmarkedProblemIds: updated });
  };

  const handleClearAllBookmarks = () => {
    if (confirm('저장된 모든 북마크를 비우시겠습니까?')) {
      onUpdateProfile({ bookmarkedProblemIds: [] });
    }
  };

  const getGradeLabel = (g: GradeType) => {
    switch (g) {
      case 'middle_3':
        return '중학교 3학년';
      case 'high_1':
        return '고등학교 1학년';
      case 'high_2_3':
        return '고등학교 2학년';
      default:
        return '고등학생';
    }
  };

  return (
    <div
      id="user-profile-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-xl bg-[#FFFDF9] rounded-3xl shadow-2xl border-4 border-amber-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header with Avatar & Level */}
        <div
          className={`p-5 text-white flex items-start justify-between relative shadow-md ${
            userProfile.role === 'admin'
              ? 'bg-gradient-to-r from-amber-600 via-orange-500 to-amber-500'
              : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-white/20 border-2 border-white/40 flex items-center justify-center text-3xl shadow-inner shrink-0">
              {userProfile.role === 'admin' ? '👨‍🏫' : '🎒'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-black tracking-tight">{userProfile.nickname}</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-white/25 text-[11px] font-black border border-white/30 flex items-center gap-1 shadow-xs">
                  {userProfile.role === 'admin' ? (
                    <>
                      <ShieldCheck className="w-3 h-3" />
                      <span>관리자</span>
                    </>
                  ) : (
                    <>
                      <span>🎒</span>
                      <span>{getGradeLabel(userProfile.grade)}</span>
                    </>
                  )}
                </span>
              </div>
              <p className="text-xs text-white/90 font-medium mt-0.5 flex items-center gap-1">
                <School className="w-3.5 h-3.5" />
                {userProfile.schoolName}
                {userProfile.loginId && (
                  <span className="text-[11px] opacity-80 ml-1">(@{userProfile.loginId})</span>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-2 p-3 bg-amber-50/80 border-b border-amber-200 text-center">
          <div
            onClick={() => setActiveTab('bookmarks')}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              activeTab === 'bookmarks'
                ? 'bg-blue-50 border-blue-400 shadow-sm'
                : 'bg-white border-amber-200 hover:border-amber-400'
            }`}
          >
            <span className="text-[10px] text-slate-500 font-bold block">북마크한 문제</span>
            <span className="text-base font-black text-blue-600">
              {bookmarkedProblems.length}개
            </span>
          </div>

          <div
            onClick={() => setActiveTab('history')}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-amber-50 border-amber-400 shadow-sm'
                : 'bg-white border-amber-200 hover:border-amber-400'
            }`}
          >
            <span className="text-[10px] text-slate-500 font-bold block">질문 해결 기록</span>
            <span className="text-base font-black text-amber-600">
              {userProfile.historyQuestions?.length || 0}개
            </span>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="flex border-b border-amber-200 bg-white px-3 pt-2 gap-1.5 overflow-x-auto">
          <button
            onClick={() => setActiveTab('bookmarks')}
            className={`pb-2.5 px-2.5 text-xs sm:text-sm font-bold flex items-center gap-1.5 border-b-2 transition-colors shrink-0 ${
              activeTab === 'bookmarks'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Bookmark className="w-4 h-4" />
            <span>북마크 ({bookmarkedProblems.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`pb-2.5 px-2.5 text-xs sm:text-sm font-bold flex items-center gap-1.5 border-b-2 transition-colors shrink-0 ${
              activeTab === 'history'
                ? 'border-amber-600 text-amber-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <History className="w-4 h-4" />
            <span>질문 기록 ({userProfile.historyQuestions?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('edit')}
            className={`pb-2.5 px-2.5 text-xs sm:text-sm font-bold flex items-center gap-1.5 border-b-2 transition-colors shrink-0 ${
              activeTab === 'edit'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Edit2 className="w-4 h-4" />
            <span>프로필 관리</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: BOOKMARKS */}
          {activeTab === 'bookmarks' && (
            <div className="space-y-3">
              {bookmarkedProblems.length > 0 && (
                <div className="flex items-center justify-between pb-1">
                  <span className="text-xs font-bold text-slate-600">
                    저장된 교과서 문제 <strong>{bookmarkedProblems.length}</strong>개
                  </span>
                  <button
                    type="button"
                    onClick={handleClearAllBookmarks}
                    className="text-[11px] text-slate-400 hover:text-rose-600 font-bold transition-colors"
                  >
                    전체 비우기
                  </button>
                </div>
              )}

              {bookmarkedProblems.length === 0 ? (
                <div className="p-8 text-center bg-amber-50/50 rounded-2xl border border-dashed border-amber-200">
                  <Bookmark className="w-8 h-8 mx-auto text-amber-400 mb-2 opacity-70" />
                  <p className="text-sm font-bold text-slate-700">북마크한 문제가 없습니다</p>
                  <p className="text-xs text-slate-500 mt-1">
                    교과서 풀이에서 ⭐️ 북마크 아이콘을 누르면 언제든 바로 모아서 볼 수 있습니다!
                  </p>
                </div>
              ) : (
                bookmarkedProblems.map((prob) => (
                  <div
                    key={prob.id}
                    onClick={() => {
                      onClose();
                      onSelectProblem(prob);
                    }}
                    className="p-3.5 bg-white rounded-2xl border border-amber-200 hover:border-amber-400 hover:shadow-md cursor-pointer transition-all space-y-1.5 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            prob.subject === 'math'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {prob.subject === 'math' ? '공통수학' : '통합과학'}
                        </span>
                        <span className="text-xs font-black text-slate-800">
                          p.{prob.pageNumber} {prob.problemNumber}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => handleRemoveBookmark(e, prob.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                          title="북마크 해제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs text-amber-600 font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                          <span>풀이 보기</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-700 font-medium line-clamp-2">
                      {prob.problemText}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              {(userProfile.historyQuestions || []).length === 0 ? (
                <div className="p-8 text-center bg-amber-50/50 rounded-2xl border border-dashed border-amber-200">
                  <History className="w-8 h-8 mx-auto text-amber-400 mb-2 opacity-70" />
                  <p className="text-sm font-bold text-slate-700">질문한 기록이 없습니다</p>
                  <p className="text-xs text-slate-500 mt-1">
                    질문 및 학습한 기록이 여기에 안전하게 보관됩니다.
                  </p>
                </div>
              ) : (
                userProfile.historyQuestions.map((q) => (
                  <div
                    key={q.id}
                    onClick={() => {
                      onClose();
                      onSelectHistoryQuestion(q);
                    }}
                    className="p-3.5 bg-white rounded-2xl border border-amber-200 hover:border-amber-400 hover:shadow-md cursor-pointer transition-all space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-700">
                        {q.subject} · {q.problemTitle}
                      </span>
                      <span className="text-[10px] text-slate-400">{q.createdAt}</span>
                    </div>
                    <p className="text-xs text-slate-700 font-medium line-clamp-2">
                      {q.extractedProblemText}
                    </p>
                    <div className="text-[11px] text-emerald-700 font-bold">
                      정답: {q.finalAnswer}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 4: EDIT PROFILE & LOGOUT */}
          {activeTab === 'edit' && (
            <div className="space-y-5">
              <form onSubmit={handleSaveProfile} className="space-y-3.5">
                {savedSuccess && (
                  <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-1.5">
                    <Check className="w-4 h-4" /> 프로필이 저장되었습니다!
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    닉네임 / 성함
                  </label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="w-full px-3 py-2 bg-white rounded-xl border border-amber-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-400"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    학교 / 소속
                  </label>
                  <input
                    type="text"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    className="w-full px-3 py-2 bg-white rounded-xl border border-amber-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="예: 대구화원고등학교"
                  />
                </div>

                {userProfile.role === 'student' && (
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      학년 선택
                    </label>
                    <select
                      value={grade}
                      onChange={(e) => setGrade(e.target.value as GradeType)}
                      className="w-full px-3 py-2 bg-white rounded-xl border border-amber-200 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    >
                      <option value="middle_1">중학교 1학년</option>
                      <option value="middle_2">중학교 2학년</option>
                      <option value="middle_3">중학교 3학년</option>
                      <option value="high_1">고등학교 1학년</option>
                      <option value="high_2_3">고등학교 2·3학년</option>
                    </select>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-98"
                >
                  프로필 저장하기
                </button>
              </form>

              {/* Logout & Role Switch Section */}
              <div className="pt-4 border-t border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-600 block">계정 및 권한 관리</span>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      현재 접속 권한: {userProfile.role === 'admin' ? '👨‍🏫 관리자' : ' 🎒 학생'}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      로그아웃하고 다른 계정으로 로그인할 수 있습니다.
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onLogout();
                    }}
                    className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-1 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>로그아웃</span>
                  </button>
                </div>

                <div className="p-3 bg-rose-50/60 rounded-2xl border border-rose-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-rose-900 block">
                      현재 계정 탈퇴 및 삭제
                    </span>
                    <span className="text-[11px] text-rose-700">
                      이 기기에서 현재 계정 데이터를 완전히 삭제하고 로그아웃합니다.
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('정말 현재 계정을 삭제하고 탈퇴하시겠습니까?')) {
                        if (userProfile.id) {
                          deleteAccountById(userProfile.id);
                        }
                        onClose();
                        onLogout();
                      }
                    }}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center gap-1 transition-colors shrink-0 shadow-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>계정 삭제</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-amber-50/70 border-t border-amber-200 flex items-center justify-end">
          <button
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="text-xs text-rose-600 font-bold hover:underline flex items-center gap-1"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>계정 전환 / 로그아웃</span>
          </button>
        </div>
      </motion.div>

      {/* Fullscreen Zoom Image Modal */}
      <AnimatePresence>
        {zoomImage && (
          <div
            className="fixed inset-0 z-70 bg-black/85 flex items-center justify-center p-4 cursor-pointer"
            onClick={() => setZoomImage(null)}
          >
            <div className="relative max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl border-2 border-white/40 shadow-2xl">
              <img
                src={zoomImage}
                alt="확대 사진"
                className="w-full h-full object-contain"
              />
              <button
                type="button"
                onClick={() => setZoomImage(null)}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default UserProfileModal;