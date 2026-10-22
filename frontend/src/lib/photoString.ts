// Cebuano text for the photo reader. First draft: a native speaker must review it (move it into strings.ts later if you like).
// TODO: once the backend confirms the photo is not stored or logged, add that to `privacy`.
export const photoText = {
  title: "Litrato sa dokumento",
  privacy: "Ipadala ang litrato sa server aron mabasa ang teksto.",
  camera: "Kuhaa ug litrato",
  gallery: "Pili ug litrato",
  reading: "Gibasa ang litrato...",
  cancel: "Undangon",
  retry: "Sulayi pag-usab",
  remove: "Kuhaa ang litrato",
  done: "Nabasa na. Susiha ug ayoha ang mga sayop sa teksto sa ubos una ipasabot.",
  low: "Dili klaro ang pagkabasa. Susiha pag-ayo ang teksto sa ubos, o sulayi pag-usab sa mas hayag nga suga.",
  empty: "Walay nabasa nga teksto. Sulayi pag-usab: hayag nga suga, tul-id nga litrato, ug duol ang dokumento.",
  errorType: "Kini nga klase sa litrato dili suportado. Gamita ang JPG, PNG, o WebP.",
  errorSize: "Dako ra kaayo ang litrato (labaw sa 10 MB).",
  errorBusy: "Busy ang serbisyo karon. Sulayi pag-usab sa makadiyot.",
  errorNetwork: "Walay koneksyon sa internet. Susiha ang koneksyon ug sulayi pag-usab.",
  errorTimeout: "Taas ra kaayo ang paghulat. Sulayi pag-usab.",
  errorGeneric: "Napakyas ang pagbasa sa litrato. Sulayi pag-usab o i-type ang teksto.",
  previewAlt: "Gipili nga litrato sa dokumento",
} as const;