import React from "react";

export default function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div className="modal-backdrop" onMouseDown={onCancel}>
      <div className="confirm-dialog" onMouseDown={(e) => e.stopPropagation()}>
        <h2>Confirm</h2>
        <p>{message}</p>
        <div className="confirm-actions">
          <button className="cancel" onClick={onCancel}>Cancel</button>
          <button className="primary-button" onClick={onConfirm}>Log out</button>
        </div>
      </div>
    </div>
  );
}
