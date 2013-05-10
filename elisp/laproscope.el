(defun laproscope-open-stream (&rest local-alist)
  (let ((buffer (generate-new-buffer "*laproscope*")))
    (with-current-buffer buffer
      (while local-alist
        (set (make-local-variable (caar local-alist)) (cadar local-alist))
        (setq local-alist (cdr local-alist)))
      (make-local-variable 'laproscope-line-function))
    (let ((stream (open-network-stream "laproscope" buffer "localhost" 17428)))
      (set-process-filter stream 'laproscope-stream-filter)
      (set-process-sentinel stream 'laproscope-sentinel)
      stream)))

(defun laproscope-sentinel (process event)
  nil)

(defun laproscope-stream-filter (proc string)
  (when (buffer-live-p (process-buffer proc))
    (with-current-buffer (process-buffer proc)
      (save-excursion
        (goto-char (process-mark proc))
        (insert string)
        (set-marker (process-mark proc) (point)))
      (laproscope-parse-new-output proc))))

(defun laproscope-parse-new-output (proc)
  (while
      (and
       (buffer-live-p (process-buffer proc))
       (let ((start (point)))
         (cond ((looking-at "[= !.][- ].*\n")
                (let ((type (char-after))
                      (cont (char-after (1+ (point)))))
                  ;; Clean up framing characters.
                  (delete-region (point) (+ (point) 2))
                  ;; This promises to leave point at the start of the next line; it
                  ;; may or may not remove the text from the buffer.
                  (laproscope-on-line type cont)
                  t))
               ((looking-at "l> ")
                (delete-region (point) (+ (point) 3))
                (laproscope-on-prompt)
                t)
               ((looking-at ".*\n")
                (forward-line 1)
                (error "Strange text from laproscope: %S" (buffer-substring start (point))))
               (t
                ;; An incomplete line; wait for more input to arrive.
                nil))))))

(defun laproscope-on-prompt ()
  (if (boundp 'laproscope-prompt-function) (funcall laproscope-prompt-function)))

(defun laproscope-on-line (type cont)
  (if (boundp 'laproscope-line-function)
      (funcall laproscope-line-function type cont)
    (forward-line 1)))

(defun laproscope-send-region (start end)
  (interactive "r")
  (let* ((stream (laproscope-open-stream
                  '(laproscope-prompt-function laproscope-send-region-on-prompt)
                  '(laproscope-prompt-count 0))))
    (save-excursion
      (goto-char start)
      (while
          (progn
            (let ((line-start (point)))
              (forward-line 1)
              (process-send-string stream (if (< (point) end) "\\ " "\\."))
              (process-send-region stream line-start (min end (point))))
            (< (point) end)))
      ;; Depending on the region, we may need to send a final newline.
      (unless (and (< start end) (= (char-after (1- end)) ?\n))
        (process-send-string stream "\n")))))

(defun laproscope-send-region-on-prompt ()
  (when (= 2 (incf laproscope-prompt-count))
    (let ((stream (get-buffer-process (current-buffer))))
      (process-send-eof stream)
      (delete-process stream)
      (let ((stream (current-buffer))
            (display (get-buffer-create "*laproscope-output*")))
        (with-current-buffer display
          (erase-buffer)
          (insert-buffer-substring stream))
        (kill-buffer stream)
        (display-message-or-buffer display)))))
