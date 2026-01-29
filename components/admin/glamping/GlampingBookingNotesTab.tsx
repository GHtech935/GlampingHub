'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { User, Pencil, Trash2, Send, Loader2 } from 'lucide-react';
import { type Locale } from '@/lib/i18n-utils';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

interface Note {
  id: string;
  bookingId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface GlampingBookingNotesTabProps {
  booking: {
    id: string;
  };
  locale?: Locale;
}

const texts = {
  vi: {
    placeholder: 'Thêm ghi chú...',
    send: 'Gửi',
    noNotes: 'Chưa có ghi chú nào',
    edit: 'Sửa',
    delete: 'Xóa',
    save: 'Lưu',
    cancel: 'Hủy',
    edited: '(đã sửa)',
    confirmDelete: 'Bạn có chắc muốn xóa ghi chú này?',
    loading: 'Đang tải...',
    errorLoad: 'Không thể tải ghi chú',
    errorCreate: 'Không thể tạo ghi chú',
    errorUpdate: 'Không thể cập nhật ghi chú',
    errorDelete: 'Không thể xóa ghi chú',
    successCreate: 'Đã thêm ghi chú',
    successUpdate: 'Đã cập nhật ghi chú',
    successDelete: 'Đã xóa ghi chú',
  },
  en: {
    placeholder: 'Add a note...',
    send: 'Send',
    noNotes: 'No notes yet',
    edit: 'Edit',
    delete: 'Delete',
    save: 'Save',
    cancel: 'Cancel',
    edited: '(edited)',
    confirmDelete: 'Are you sure you want to delete this note?',
    loading: 'Loading...',
    errorLoad: 'Failed to load notes',
    errorCreate: 'Failed to create note',
    errorUpdate: 'Failed to update note',
    errorDelete: 'Failed to delete note',
    successCreate: 'Note added',
    successUpdate: 'Note updated',
    successDelete: 'Note deleted',
  },
};

export function GlampingBookingNotesTab({
  booking,
  locale = 'vi',
}: GlampingBookingNotesTabProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [newContent, setNewContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const t = texts[locale];

  // Fetch notes
  const fetchNotes = async () => {
    try {
      const res = await fetch(
        `/api/admin/glamping/bookings/${booking.id}/notes`
      );
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setNotes(data.notes);
      setCurrentUserId(data.currentUserId);
      setCurrentUserRole(data.currentUserRole);
    } catch {
      toast.error(t.errorLoad);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (booking.id) {
      fetchNotes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking.id]);

  // Create note
  const handleCreate = async () => {
    const content = newContent.trim();
    if (!content) return;

    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/admin/glamping/bookings/${booking.id}/notes`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        }
      );
      if (!res.ok) throw new Error('Failed to create');
      setNewContent('');
      toast.success(t.successCreate);
      await fetchNotes();
    } catch {
      toast.error(t.errorCreate);
    } finally {
      setSubmitting(false);
    }
  };

  // Update note
  const handleUpdate = async (noteId: string) => {
    const content = editContent.trim();
    if (!content) return;

    setActionLoading(true);
    try {
      const res = await fetch(
        `/api/admin/glamping/bookings/${booking.id}/notes/${noteId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        }
      );
      if (!res.ok) throw new Error('Failed to update');
      setEditingNoteId(null);
      setEditContent('');
      toast.success(t.successUpdate);
      await fetchNotes();
    } catch {
      toast.error(t.errorUpdate);
    } finally {
      setActionLoading(false);
    }
  };

  // Delete note
  const handleDelete = async (noteId: string) => {
    if (!confirm(t.confirmDelete)) return;

    setActionLoading(true);
    try {
      const res = await fetch(
        `/api/admin/glamping/bookings/${booking.id}/notes/${noteId}`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error('Failed to delete');
      toast.success(t.successDelete);
      await fetchNotes();
    } catch {
      toast.error(t.errorDelete);
    } finally {
      setActionLoading(false);
    }
  };

  const canEditOrDelete = (note: Note) =>
    currentUserId === note.authorId || currentUserRole === 'admin';

  const isEdited = (note: Note) =>
    note.updatedAt && note.updatedAt !== note.createdAt;

  const formatDateTime = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'dd/MM/yyyy HH:mm');
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">{t.loading}</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* New note input */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <div className="flex gap-3">
          <Textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder={t.placeholder}
            className="flex-1 min-h-[80px] resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleCreate();
              }
            }}
          />
          <Button
            onClick={handleCreate}
            disabled={submitting || !newContent.trim()}
            className="self-end"
            size="sm"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span className="ml-1">{t.send}</span>
          </Button>
        </div>
      </div>

      {/* Notes list */}
      {notes.length === 0 ? (
        <div className="text-center py-8 text-gray-500">{t.noNotes}</div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div
              key={note.id}
              className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
            >
              {/* Header: author + actions */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="font-medium text-blue-600 text-sm">
                    {note.authorName}
                  </span>
                  {canEditOrDelete(note) && editingNoteId !== note.id && (
                    <div className="flex items-center gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-gray-500 hover:text-blue-600"
                        onClick={() => {
                          setEditingNoteId(note.id);
                          setEditContent(note.content);
                        }}
                        disabled={actionLoading}
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        {t.edit}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-gray-500 hover:text-red-600"
                        onClick={() => handleDelete(note.id)}
                        disabled={actionLoading}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        {t.delete}
                      </Button>
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-400">
                  {formatDateTime(note.createdAt)}
                  {isEdited(note) && (
                    <span className="ml-1 italic">{t.edited}</span>
                  )}
                </div>
              </div>

              {/* Content or edit mode */}
              {editingNoteId === note.id ? (
                <div className="space-y-2">
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="min-h-[60px] resize-none"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingNoteId(null);
                        setEditContent('');
                      }}
                      disabled={actionLoading}
                    >
                      {t.cancel}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleUpdate(note.id)}
                      disabled={actionLoading || !editContent.trim()}
                    >
                      {actionLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : null}
                      {t.save}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-700 whitespace-pre-line">
                  {note.content}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
