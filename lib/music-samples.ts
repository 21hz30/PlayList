export type MusicSample = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  language: string;
  kind: "instrumental" | "song";
  src?: string;
  duration?: number;
  lyrics?: string;
};

function audioPreviewUrl(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" && !url.username && !url.password ? url.href : undefined;
  } catch {
    return undefined;
  }
}

// Original samples generated with ChatCut / Mureka; source records: docs/music-sample-provenance.json.
export const MUSIC_SAMPLES: MusicSample[] = [
  { id: "paper-window", src: audioPreviewUrl(process.env.NEXT_PUBLIC_PAPER_WINDOW_URL), duration: 152.15, title: "Paper Window", subtitle: "Focus · Lo-fi", description: "Soft keys and gentle beats. A little space for the task in front of you.", language: "Instrumental", kind: "instrumental" },
  { id: "own-tempo", src: audioPreviewUrl(process.env.NEXT_PUBLIC_OWN_TEMPO_URL), duration: 66.07, title: "Own Tempo", subtitle: "Move · Electronic Pop", description: "Bright synths and a steady groove. Move at your own pace.", language: "Mandarin + English", kind: "song", lyrics: "[Verse]\n城市醒来，我系好鞋带\n把昨天的噪音，留在门外\nOne small step, I find my way\n跟着心跳，开始今天\n[Chorus]\nMy own tempo, my own time\n不用追上谁的光\n一步一步，走向远方\nMy own rhythm, here I am" },
  { id: "blue-hour", src: audioPreviewUrl(process.env.NEXT_PUBLIC_BLUE_HOUR_URL), duration: 91.47, title: "Blue Hour", subtitle: "Unwind · Warm Downtempo", description: "Warm keys, soft guitar, and intimate vocals. Take your time.", language: "Mandarin + English", kind: "song", lyrics: "[Verse]\n窗边的光，慢慢落下\n今天的事，就先放下\nLeave a little room to breathe\n让风翻过这一页\n[Chorus]\nSlow down, stay here with me\n把夜晚调成温柔的频率\n不必回答，不必着急\nIn this quiet, I can be" },
];
