"use client";

interface LogoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export default function LogoutModal({ isOpen, onClose, onConfirm }: LogoutModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 w-96 shadow-xl">
                <h2 className="text-xl font-bold text-slate-800 mb-2">Confirm Logout</h2>
                <p className="text-slate-600 mb-6">Are you sure you want to logout from admin panel?</p>
                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 font-medium hover:bg-slate-100 transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-6 py-2.5 rounded-xl bg-rose-600 text-white font-medium hover:bg-rose-700 transition"
                    >
                        Logout
                    </button>
                </div>
            </div>
        </div>
    );
}