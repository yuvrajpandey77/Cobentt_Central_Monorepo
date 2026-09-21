import type { SVGProps } from "react";

type Icon = (props: SVGProps<SVGSVGElement>) => React.ReactElement;

function i(path: string): Icon {
  const SvgIcon = ({ className, ...props }: SVGProps<SVGSVGElement>) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {path}
    </svg>
  );
  SvgIcon.displayName = "SvgIcon";
  return SvgIcon;
}

export const ArrowRight = i("<path d='M5 12h14' /><path d='m12 5 7 7-7 7' />");
export const Bot = i("<path d='M12 8V4H8' /><rect width='16' height='12' x='4' y='8' rx='2' /><path d='M2 14h2' /><path d='M20 14h2' /><path d='M15 13v2' /><path d='M9 13v2' />");
export const Target = i("<circle cx='12' cy='12' r='10' /><circle cx='12' cy='12' r='6' /><circle cx='12' cy='12' r='2' />");
export const Eye = i("<path d='M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0' /><circle cx='12' cy='12' r='3' />");
export const Heart = i("<path d='M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5' />");
export const Shield = i("<path d='M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z' />");
export const Cpu = i("<path d='M12 20v2' /><path d='M12 2v2' /><path d='M17 20v2' /><path d='M17 2v2' /><path d='M2 12h2' /><path d='M2 17h2' /><path d='M2 7h2' /><path d='M20 12h2' /><path d='M20 17h2' /><path d='M20 7h2' /><path d='M7 20v2' /><path d='M7 2v2' /><rect x='4' y='4' width='16' height='16' rx='2' /><rect x='8' y='8' width='8' height='8' rx='1' />");
export const Users = i("<path d='M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' /><path d='M16 3.128a4 4 0 0 1 0 7.744' /><path d='M22 21v-2a4 4 0 0 0-3-3.87' /><circle cx='9' cy='7' r='4' />");
export const MessageSquare = i("<path d='M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z' />");
export const BrainCircuit = i("<path d='M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z' /><path d='M9 13a4.5 4.5 0 0 0 3-4' /><path d='M6.003 5.125A3 3 0 0 0 6.401 6.5' /><path d='M3.477 10.896a4 4 0 0 1 .585-.396' /><path d='M6 18a4 4 0 0 1-1.967-.516' /><path d='M12 13h4' /><path d='M12 18h6a2 2 0 0 1 2 2v1' /><path d='M12 8h8' /><path d='M16 8V5a2 2 0 0 1 2-2' /><circle cx='16' cy='13' r='.5' /><circle cx='18' cy='3' r='.5' /><circle cx='20' cy='21' r='.5' /><circle cx='20' cy='8' r='.5' />");
export const Search = i("<path d='m21 21-4.34-4.34' /><circle cx='11' cy='11' r='8' />");
export const Code2 = i("<path d='m18 16 4-4-4-4' /><path d='m6 8-4 4 4 4' /><path d='m14.5 4-5 16' />");
export const FileText = i("<path d='M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z' /><path d='M14 2v5a1 1 0 0 0 1 1h5' /><path d='M10 9H8' /><path d='M16 13H8' /><path d='M16 17H8' />");
export const FolderKanban = i("<path d='M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z' /><path d='M8 10v4' /><path d='M12 10v2' /><path d='M16 10v6' />");
export const Palette = i("<path d='M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z' /><circle cx='13.5' cy='6.5' r='.5' fill='currentColor' /><circle cx='17.5' cy='10.5' r='.5' fill='currentColor' /><circle cx='6.5' cy='12.5' r='.5' fill='currentColor' /><circle cx='8.5' cy='7.5' r='.5' fill='currentColor' />");
export const Image = i("<rect width='18' height='18' x='3' y='3' rx='2' ry='2' /><circle cx='9' cy='9' r='2' /><path d='m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21' />");
export const Globe = i("<circle cx='12' cy='12' r='10' /><path d='M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20' /><path d='M2 12h20' />");
export const Mic = i("<path d='M12 19v3' /><path d='M19 10v2a7 7 0 0 1-14 0v-2' /><rect x='9' y='2' width='6' height='13' rx='3' />");
export const Puzzle = i("<path d='M15.39 4.39a1 1 0 0 0 1.68-.474 2.5 2.5 0 1 1 3.014 3.015 1 1 0 0 0-.474 1.68l1.683 1.682a2.414 2.414 0 0 1 0 3.414L19.61 15.39a1 1 0 0 1-1.68-.474 2.5 2.5 0 1 0-3.014 3.015 1 1 0 0 1 .474 1.68l-1.683 1.682a2.414 2.414 0 0 1-3.414 0L8.61 19.61a1 1 0 0 0-1.68.474 2.5 2.5 0 1 1-3.014-3.015 1 1 0 0 0 .474-1.68l-1.683-1.682a2.414 2.414 0 0 1 0-3.414L4.39 8.61a1 1 0 0 1 1.68.474 2.5 2.5 0 1 0 3.014-3.015 1 1 0 0 1-.474-1.68l1.683-1.682a2.414 2.414 0 0 1 3.414 0z' />");
export const Library = i("<path d='m16 6 4 14' /><path d='M12 6v14' /><path d='M8 8v12' /><path d='M4 4v16' />");
export const Database = i("<ellipse cx='12' cy='5' rx='9' ry='3' /><path d='M3 5V19A9 3 0 0 0 21 19V5' /><path d='M3 12A9 3 0 0 0 21 12' />");
export const Route = i("<circle cx='6' cy='19' r='3' /><path d='M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15' /><circle cx='18' cy='5' r='3' />");
export const FileSearch = i("<path d='M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z' /><path d='M14 2v5a1 1 0 0 0 1 1h5' /><circle cx='11.5' cy='14.5' r='2.5' /><path d='M13.3 16.3 15 18' />");
export const Quote = i("<path d='M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z' /><path d='M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z' />");
export const FileEdit = i("<path d='M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z' /><path d='M14 2v5a1 1 0 0 0 1 1h5' /><path d='M15 14.5 11.5 18H10v-1.5L13.5 13a1 1 0 0 1 1.5 1.5z' />");
export const Download = i("<path d='M12 15V3' /><path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' /><path d='m7 10 5 5 5-5' />");
export const BookOpen = i("<path d='M12 7v14' /><path d='M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z' />");
export const Bookmark = i("<path d='M17 3a2 2 0 0 1 2 2v15a1 1 0 0 1-1.496.868l-4.512-2.578a2 2 0 0 0-1.984 0l-4.512 2.578A1 1 0 0 1 5 20V5a2 2 0 0 1 2-2z' />");
export const Check = i("<path d='M20 6 9 17l-5-5' />");
export const Clock = i("<circle cx='12' cy='12' r='10' /><path d='M12 6v6l4 2' />");
export const GitPullRequest = i("<circle cx='18' cy='18' r='3' /><circle cx='6' cy='6' r='3' /><path d='M13 6h3a2 2 0 0 1 2 2v7' /><line x1='6' x2='6' y1='9' y2='21' />");
export const Terminal = i("<path d='M12 19h8' /><path d='m4 17 6-6-6-6' />");
export const GitBranch = i("<path d='M15 6a9 9 0 0 0-9 9V3' /><circle cx='18' cy='6' r='3' /><circle cx='6' cy='18' r='3' />");
export const Bug = i("<path d='M12 20v-9' /><path d='M14 7a4 4 0 0 1 4 4v3a6 6 0 0 1-12 0v-3a4 4 0 0 1 4-4z' /><path d='M14.12 3.88 16 2' /><path d='M21 21a4 4 0 0 0-3.81-4' /><path d='M21 5a4 4 0 0 1-3.55 3.97' /><path d='M22 13h-4' /><path d='M3 21a4 4 0 0 1 3.81-4' /><path d='M3 5a4 4 0 0 0 3.55 3.97' /><path d='M6 13H2' /><path d='m8 2 1.88 1.88' /><path d='M9 7.13V6a3 3 0 1 1 6 0v1.13' />");
export const Rocket = i("<path d='M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5' /><path d='M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09' /><path d='M9 12a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.4 22.4 0 0 1-4 2z' /><path d='M9 12H4s.55-3.03 2-4c1.62-1.08 5 .05 5 .05' />");
export const FileCode = i("<path d='M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z' /><path d='M14 2v5a1 1 0 0 0 1 1h5' /><path d='M10 12.5 8 15l2 2.5' /><path d='m14 12.5 2 2.5-2 2.5' />");
export const ExternalLink = i("<path d='M15 3h6v6' /><path d='M10 14 21 3' /><path d='M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6' />");
export const Mail = i("<path d='m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7' /><rect x='2' y='4' width='20' height='16' rx='2' />");
export const Trash2 = i("<path d='M10 11v6' /><path d='M14 11v6' /><path d='M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6' /><path d='M3 6h18' /><path d='M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' />");
export const ShieldCheck = i("<path d='M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z' /><path d='m9 12 2 2 4-4' />");
