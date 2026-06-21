import React from "react";
import { Link } from "react-router-dom";
import { initials } from "../../utils/string.js";

export default function PrivateNetworkList({ title, users }) {
  return (
    <div>
      <h2>{title}</h2>
      {users.length ? users.map((user) => (
        <Link className="network-user" key={user._id} to={`/profile/${user._id}`}>
          <span className="avatar avatar-blue">{initials(user.name)}</span>
          <span><b>{user.name}</b><small>{user.reputation} reputation</small></span>
        </Link>
      )) : <p>No students yet.</p>}
    </div>
  );
}

