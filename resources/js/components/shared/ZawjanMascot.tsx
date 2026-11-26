import { useState } from 'react';
import { LampDesk } from 'lucide-react';
import { cn } from '@/lib/utils';

type Pose = 'welcome' | 'guide' | 'ready';

function MascotPose({ pose }: { pose: Pose }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <span className="grid h-full place-items-center text-brand-primary"><LampDesk className="h-1/3 w-1/3" /></span>;
  return <img src={`/media/zawjan-mascot-${pose}.webp`} alt="" width={512} height={512} decoding="async" draggable={false}
    onError={() => setFailed(true)} className="zj-mascot-pose h-full w-full object-contain" />;
}

/** Decorative 3D renders. Parent controls pose; instructions and actions live outside the mascot. */
export default function ZawjanMascot({ pose = 'welcome', className }: { pose?: Pose; className?: string }) {
  return <div aria-hidden="true" data-pose={pose} className={cn('pointer-events-none aspect-square select-none', className)}>
    <MascotPose key={pose} pose={pose} />
  </div>;
}
