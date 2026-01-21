import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Paperclip, 
  Upload, 
  X, 
  FileText, 
  Image as ImageIcon,
  File,
  Loader2 
} from 'lucide-react';
import { toast } from 'sonner';
import { useTaskAttachments, useUploadAttachment, useDeleteAttachment, getAttachmentUrl, TaskAttachment } from '@/hooks/useTaskAttachments';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';

interface TaskAttachmentsProps {
  taskId: string;
  readOnly?: boolean;
}

export function TaskAttachments({ taskId, readOnly = false }: TaskAttachmentsProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  
  const { data: attachments = [], isLoading } = useTaskAttachments(taskId);
  const uploadAttachment = useUploadAttachment();
  const deleteAttachment = useDeleteAttachment();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;
    
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) { // 10MB limit
          toast.error(`${file.name} is too large. Max size is 10MB.`);
          continue;
        }
        
        await uploadAttachment.mutateAsync({
          taskId,
          file,
          userId: user.id,
        });
      }
      toast.success('Files uploaded successfully!');
    } catch (error) {
      toast.error('Failed to upload files');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (attachment: TaskAttachment) => {
    try {
      await deleteAttachment.mutateAsync({
        id: attachment.id,
        filePath: attachment.file_path,
        taskId,
      });
      toast.success('Attachment deleted');
    } catch (error) {
      toast.error('Failed to delete attachment');
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return ImageIcon;
    if (fileType.includes('pdf') || fileType.includes('document')) return FileText;
    return File;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImage = (fileType: string) => fileType.startsWith('image/');

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading attachments...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Paperclip className="h-4 w-4" />
          Attachments ({attachments.length})
        </div>
        {!readOnly && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Upload
            </Button>
          </>
        )}
      </div>

      {attachments.length > 0 && (
        <div className="grid gap-2">
          {attachments.map((attachment) => {
            const FileIcon = getFileIcon(attachment.file_type);
            const url = getAttachmentUrl(attachment.file_path);
            
            return (
              <Card key={attachment.id} className="p-3">
                <div className="flex items-center gap-3">
                  {isImage(attachment.file_type) ? (
                    <a 
                      href={url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex-shrink-0"
                    >
                      <img
                        src={url}
                        alt={attachment.file_name}
                        className="h-12 w-12 rounded object-cover border"
                      />
                    </a>
                  ) : (
                    <div className="h-12 w-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                      <FileIcon className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium hover:underline truncate block"
                    >
                      {attachment.file_name}
                    </a>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatFileSize(attachment.file_size)}</span>
                      <span>•</span>
                      <span>{formatDistanceToNow(new Date(attachment.created_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                  
                  {!readOnly && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(attachment)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
      
      {attachments.length === 0 && !readOnly && (
        <p className="text-sm text-muted-foreground">
          No attachments yet. Upload files to attach them to this task.
        </p>
      )}
    </div>
  );
}
