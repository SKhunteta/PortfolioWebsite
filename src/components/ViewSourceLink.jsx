import React from "react";
import { FaGithub } from "react-icons/fa";
import { GITHUB_REPO_URL } from "../data/demos";

// Small "view source" link used in each demo's header. Styling is left to
// the call site so it can match the demo's theme.
const ViewSourceLink = ({ dir, className = "", style }) => (
  <a
    href={`${GITHUB_REPO_URL}/tree/main/${dir}`}
    target="_blank"
    rel="noopener noreferrer"
    className={`inline-flex items-center gap-1.5 transition-opacity hover:opacity-70 ${className}`}
    style={style}
    aria-label="View source on GitHub"
  >
    <FaGithub size={13} aria-hidden="true" />
    <span>source</span>
  </a>
);

export default ViewSourceLink;
