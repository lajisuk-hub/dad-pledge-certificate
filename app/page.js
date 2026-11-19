'use client';

import { useEffect, useRef, useState } from 'react';

const DATE_TEXT = '2026년 11월 19일';
const KEY = 'dad-pledge-cert-v1';
const EMPTY = { center: '', child: '', pledge: '', dad: '', body: '' };
const DEFAULT_BODY =
  '위 아빠는 아빠교육 「좋은 아빠보다, 필요한 아빠」를 끝까지 함께하며 아이에게 꼭 필요한 아빠가 되기로 다짐하였기에 이 수료증을 드립니다.';

function EditableText({ value, onChange, className = '', tag = 'span', placeholder = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && ref.current.innerText !== value) ref.current.innerText = value;
  }, [value]);
  const Tag = tag;
  return (
    <Tag
      ref={ref}
      className={`editable ${className}`}
      contentEditable
      suppressContentEditableWarning
      data-ph={placeholder}
      title="눌러서 고칠 수 있어요"
      onBlur={(e) => {
        const v = e.currentTarget.innerText.replace(/\n+$/, '');
        if (v !== value) onChange(v);
      }}
      onPaste={(e) => {
        e.preventDefault();
        document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
      }}
    />
  );
}

function Certificate({ d, set }) {
  const child = d.child.trim() || '○○';
  return (
    <div className="sheet" id="cert-sheet">
      <div className="frame">
        <img className="spark s1" src="/spark.png" alt="" />
        <img className="spark s2" src="/spark.png" alt="" />
        <div className="badge">2학기 정규 아빠교육 프로그램</div>

        <div className="title-wrap">
          <img className="brush" src="/brush.png" alt="" />
          <h1 className="title">아빠 다짐 수료증</h1>
        </div>
        <div className="sub">좋은 아빠보다, 필요한 아빠</div>

        <div className="photo-ring">
          <div className="photo-img" />
        </div>

        <div className="who">
          <EditableText value={`${child} 아빠`} onChange={(v) => set({ child: v.replace(/\s*아빠\s*$/, '') })} className="who-child" />
          <EditableText value={d.dad.trim() || '○○○'} onChange={(v) => set({ dad: v })} className="who-name" />
        </div>

        <EditableText tag="p" value={d.body || DEFAULT_BODY} onChange={(v) => set({ body: v })} className="body" />

        <div className="pledge">
          <img className="heart" src="/ico_heart_t.png" alt="" />
          <div className="pl-label">나의 아빠 다짐</div>
          <div className="pl-line">
            나는 우리 <EditableText value={child} onChange={(v) => set({ child: v })} className="pl-child" />에게
          </div>
          <div className="pl-quote">
            “<EditableText value={d.pledge.trim() || '○○○○'} onChange={(v) => set({ pledge: v })} className="pl-word" />”
          </div>
          <div className="pl-line">아빠가 되고 싶습니다.</div>
        </div>

        <div className="date">{DATE_TEXT}</div>
        <EditableText
          tag="div"
          value={d.center.trim() || '○○어린이집'}
          onChange={(v) => set({ center: v })}
          className="issuer"
        />
      </div>
      <img className="hills" src="/hills.png" alt="" />
    </div>
  );
}

export default function Page() {
  const [d, setD] = useState(EMPTY);
  const [step, setStep] = useState('form'); // form | preview
  const [scale, setScale] = useState(1);
  const [busy, setBusy] = useState(false);
  const [files, setFiles] = useState(null); // { img, pdf, imgFile }
  const [err, setErr] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (s) setD({ ...EMPTY, ...s });
    } catch {}
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(KEY, JSON.stringify(d)); } catch {}
    setFiles(null);
  }, [d, loaded]);

  useEffect(() => {
    const fit = () => setScale(Math.min(1, (window.innerWidth - 24) / 794));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  const set = (patch) => setD((prev) => ({ ...prev, ...patch }));
  const ready = d.child.trim() && d.pledge.trim() && d.dad.trim();

  async function capture() {
    const html2canvas = (await import('html2canvas')).default;
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    const el = document.getElementById('cert-sheet');
    return html2canvas(el, {
      scale: 2,
      backgroundColor: '#fffaf0',
      useCORS: true,
      onclone: (doc) => {
        const sc = doc.querySelector('.scaler');
        if (sc) { sc.style.transform = 'none'; }
        const box = doc.querySelector('.scale-box');
        if (box) { box.style.width = '794px'; box.style.height = '1123px'; }
      },
    });
  }

  async function makeFiles() {
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    setBusy(true);
    setErr('');
    try {
      await new Promise((r) => setTimeout(r, 80));
      const canvas = await capture();
      const jpg = canvas.toDataURL('image/jpeg', 0.92);
      const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.92));
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      pdf.addImage(jpg, 'JPEG', 0, 0, 210, 297);
      const pdfUrl = URL.createObjectURL(pdf.output('blob'));
      const base = `아빠다짐수료증_${(d.dad || '').trim() || '아빠'}`;
      const imgFile = new File([blob], `${base}.jpg`, { type: 'image/jpeg' });
      setFiles({ img: URL.createObjectURL(blob), jpg, pdf: pdfUrl, imgFile, base });
    } catch (e) {
      setErr('저장 파일을 만들지 못했어요. 다시 한 번 눌러 주세요.');
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    try {
      await navigator.share({ files: [files.imgFile], title: '아빠 다짐 수료증' });
    } catch {}
  }

  const canShare =
    files && typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [files.imgFile] });

  return (
    <main>
      {step === 'form' && (
        <section className="card app-ui">
          <img className="form-brush" src="/brush.png" alt="" />
          <div className="form-badge">2학기 정규 아빠교육</div>
          <h1 className="form-title">나의 아빠 다짐 수료증</h1>
          <p className="form-lead">아이 이름을 넣어 문장을 완성하면, 오늘 날짜(11월 19일)로 수료증이 만들어져요.</p>

          <div className="sentence">
            나는 우리 <b>{d.child.trim() || '______'}</b>에게
            <br />
            <b>“{d.pledge.trim() || '__________'}”</b> 아빠가 되고 싶습니다.
          </div>

          <label>
            <span>① 아이 이름 <em>(부르는 이름 그대로, 예: 서윤이)</em></span>
            <input value={d.child} onChange={(e) => set({ child: e.target.value })} placeholder="서윤이" />
          </label>
          <label>
            <span>② 나는 어떤 아빠가 되고 싶나요? <em>(예: 기다려 주는)</em></span>
            <input value={d.pledge} onChange={(e) => set({ pledge: e.target.value })} placeholder="기다려 주는" />
          </label>
          <label>
            <span>③ 아빠 이름</span>
            <input value={d.dad} onChange={(e) => set({ dad: e.target.value })} placeholder="홍길동" />
          </label>
          <label>
            <span>④ 어린이집 이름 <em>(수료증 아래에 들어가요)</em></span>
            <input value={d.center} onChange={(e) => set({ center: e.target.value })} placeholder="햇살어린이집" />
          </label>

          <button
            className="primary"
            disabled={!ready}
            onClick={() => { setStep('preview'); window.scrollTo(0, 0); }}
          >
            {ready ? '🎖️ 수료증 만들기' : '①②③을 채우면 만들 수 있어요'}
          </button>
        </section>
      )}

      {step === 'preview' && (
        <>
          <div className="toolbar app-ui">
            <button className="ghost" onClick={() => setStep('form')}>← 다시 쓰기</button>
            <p className="edit-tip">✏️ 수료증의 글을 누르면 바로 고칠 수 있어요</p>
          </div>

          <div className="scale-box" style={{ width: 794 * scale, height: 1123 * scale }}>
            <div className="scaler" style={{ transform: `scale(${scale})` }}>
              <Certificate d={d} set={set} />
            </div>
          </div>

          <section className="save app-ui">
            {!files && (
              <button className="primary" onClick={makeFiles} disabled={busy}>
                {busy ? '만드는 중…' : '💾 수료증 저장하기'}
              </button>
            )}
            {err && <p className="err">{err}</p>}
            {files && (
              <div className="save-box">
                <p className="ok">✅ 저장할 준비가 됐어요! 아래 단추를 눌러 주세요.</p>
                {canShare && (
                  <button className="primary" onClick={share}>📱 휴대폰 사진첩에 저장(공유)</button>
                )}
                <a className="btn" href={files.img} download={`${files.base}.jpg`}>📥 사진 파일로 받기</a>
                <a className="btn" href={files.pdf} download={`${files.base}.pdf`}>📄 PDF로 받기</a>
                <button className="btn" onClick={() => window.print()}>🖨️ 인쇄하기</button>
                <details>
                  <summary>단추가 안 되면 이렇게 하세요</summary>
                  <p>아래 수료증 사진을 <b>길게 눌러</b> 「이미지 저장」을 고르세요. (컴퓨터는 오른쪽 클릭 → 이미지 저장)</p>
                  <img className="saved-img" src={files.jpg} alt="아빠 다짐 수료증" />
                </details>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
