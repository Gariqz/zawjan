import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Check, LockKeyhole, MessageCircle, Minus, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { DevModeBanner } from '@/components/feedback/DevModeBanner';
import { Wordmark } from '@/components/shared';
import ZawjanMascot from '@/components/shared/ZawjanMascot';
import { publicCopy as c } from '@/content/id/public';
import { AppLink } from '@/routing/navigation';
import { ROUTES } from '@/routing/routes';
import { useServices } from '@/services/registry';
import './public-home.css';

const chapterIds = ['contoh-cv', 'contoh-persetujuan', 'contoh-izin'] as const;
const chapterPoses = ['welcome', 'guide', 'ready'] as const;
const sectionLinks = [[c.layout.process, '#proses'], [c.layout.privacy, '#privasi'], [c.layout.faq, '#faq']] as const;
const chapterNumber = (index: number) => `0${index + 1}`;

function DemoStory() {
  const story = useRef<HTMLElement>(null);
  const [activeChapter, setActiveChapter] = useState(0);
  const [profileIndex, setProfileIndex] = useState(0);
  const [approved, setApproved] = useState(0);
  const [grantStep, setGrantStep] = useState(0);
  const { chapters, profiles, profile, approvals, grant } = c.demo;
  const currentProfile = profiles[profileIndex] ?? profiles[0];
  const ready = approved === approvals.roles.length;

  useEffect(() => {
    if (!story.current) return;
    const followHash = () => {
      const chapter = chapterIds.findIndex((id) => `#${id}` === window.location.hash);
      if (chapter !== -1) setActiveChapter(chapter);
    };
    followHash();
    window.addEventListener('hashchange', followHash);
    if (!('IntersectionObserver' in window)) return () => window.removeEventListener('hashchange', followHash);

    const panels = [...story.current.querySelectorAll<HTMLElement>('[data-chapter]')];
    let observer: IntersectionObserver;
    const observe = () => {
      observer?.disconnect();
      // IntersectionObserver percentage margins use viewport width, not height.
      const readingLine = Math.round(window.innerHeight * .36);
      observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute('data-revealed', '');
          setActiveChapter(panels.indexOf(entry.target as HTMLElement));
        }
      }, { rootMargin: `-${readingLine}px 0px -${window.innerHeight - readingLine - 1}px 0px` });
      panels.forEach((panel) => observer.observe(panel));
    };
    observe();
    window.addEventListener('resize', observe);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', observe);
      window.removeEventListener('hashchange', followHash);
    };
  }, []);

  return (
    <section id="simulasi" className="zh-story zh-wrap" ref={story} aria-labelledby="simulasi-title">
      <div className="zh-rail">
        <h2 id="simulasi-title">{c.demo.label}</h2>
        <p>{c.demo.disclaimer}</p>
        <nav aria-label="Bagian simulasi">
          {chapters.map((chapter, i) => (
            <a key={chapter.nav} href={`#${chapterIds[i]}`} aria-current={activeChapter === i ? 'location' : undefined}>
              <span className="zh-number" aria-hidden>{chapterNumber(i)}</span>
              {chapter.nav}<ArrowRight size={17} aria-hidden />
            </a>
          ))}
        </nav>
        <ZawjanMascot className="zh-guide" pose={chapterPoses[activeChapter]} />
      </div>

      <div className="zh-chapters">
        {chapters.map((chapter, i) => (
          <section className="zh-chapter" key={chapter.nav} id={chapterIds[i]} data-chapter aria-labelledby={`${chapterIds[i]}-title`}>
            <div className="zh-chapter-intro">
              <span className="zh-chapter-number zh-number" aria-hidden>{chapterNumber(i)}</span>
              <div>
                <h3 id={`${chapterIds[i]}-title`}>{chapter.title}</h3>
                <p>{chapter.body}</p>
              </div>
            </div>
            {i === 0 && (
              <div className="zh-demo zh-profile">
                <div id="contoh-cv-isi" aria-live="polite" aria-atomic="true">
                  <div className="zh-profile-header">
                    <span className="zh-initial" aria-hidden>{currentProfile.name[0]}</span>
                    <div><h4>{currentProfile.name}</h4><p>{currentProfile.meta}</p></div>
                    <span className="zh-tag">{profile.label}</span>
                  </div>
                  <p className="zh-profile-text">{currentProfile.introduction}</p>
                  <span className="sr-only">Profil {profileIndex + 1} dari {profiles.length}.</span>
                </div>
                <div className="zh-profile-nav" role="group" aria-label="Pindah profil contoh">
                  <button type="button" aria-disabled={profileIndex === 0} aria-controls="contoh-cv-isi" onClick={() => setProfileIndex((index) => Math.max(0, index - 1))}><ArrowLeft size={15} aria-hidden />{profile.previous}</button>
                  <span className="zh-number" aria-hidden>{profileIndex + 1} / {profiles.length}</span>
                  <button type="button" aria-disabled={profileIndex === profiles.length - 1} aria-controls="contoh-cv-isi" onClick={() => setProfileIndex((index) => Math.min(profiles.length - 1, index + 1))}>{profile.next}<ArrowRight size={15} aria-hidden /></button>
                </div>
                <a href="#contoh-persetujuan" className="zh-inline-link">{profile.intent}<ArrowRight size={17} aria-hidden /></a>
              </div>
            )}
            {i === 1 && (
              <div className="zh-demo zh-approvals">
                <div className="zh-demo-head">
                  <h4>{approvals.title}</h4>
                  <p className="zh-tag zh-number" aria-hidden>{approved} / {approvals.roles.length}</p>
                </div>
                <ol className="zh-approval-list">
                  {approvals.roles.map((role, index) => (
                    <li key={role} data-state={index < approved ? 'approved' : index === approved ? 'next' : 'waiting'}>
                      <span className="zh-approval-icon zh-number" aria-hidden>{index < approved ? <Check size={15} /> : index + 1}</span>
                      <span>{role}</span>
                      <span className="zh-role-status">{index < approved ? approvals.approved : index === approved ? approvals.next : approvals.waiting}</span>
                    </li>
                  ))}
                </ol>
                <div className="zh-demo-actions">
                  <button type="button" className="zh-button zh-button-primary" onClick={() => { setApproved(ready ? 0 : approved + 1); if (ready) setGrantStep(0); }}>
                    {ready ? approvals.reset : approvals.actions[approved]}
                  </button>
                  <p className="zh-status" role="status">{ready ? <MessageCircle size={16} aria-hidden /> : <LockKeyhole size={16} aria-hidden />}<span><span className="sr-only">{approved} dari {approvals.roles.length} persetujuan. </span>{ready ? approvals.complete : approvals.locked}</span></p>
                </div>
              </div>
            )}
            {i === 2 && (
              <div className="zh-demo zh-grant">
                <div className="zh-grant-head">
                  <span className="zh-lock" aria-hidden><LockKeyhole size={24} /></span>
                  <div><h4>{grant.title}</h4><p>Contoh izin setelah ruang percakapan terbuka.</p></div>
                </div>
                <dl className="zh-grant-data">
                  <div><dt>{grant.receiverLabel}</dt><dd>{grantStep === 0 ? 'Belum dipilih' : grant.recipient}</dd></div>
                  <div><dt>Status akses</dt><dd>{grant.fields[grantStep]}</dd></div>
                </dl>
                <div className="zh-demo-actions">
                  <button type="button" className="zh-button zh-button-primary" aria-disabled={!ready} onClick={() => { if (ready) setGrantStep((step) => (step + 1) % grant.fields.length); }}>{grant.actions[grantStep]}</button>
                  <p className="zh-status" role="status">{ready ? grant.messages[grantStep] : 'Selesaikan empat persetujuan contoh terlebih dahulu.'}</p>
                </div>
              </div>
            )}
          </section>
        ))}
      </div>
    </section>
  );
}

/** PUB-01 — Public home. All simulation state stays local; no real profiles or photos. */
export default function PublicHomePage() {
  const { mode } = useServices();

  return (
    <div className="zh-home">
      <a className="zh-skip" href="#main">Lewati ke konten</a>
      {mode === 'mock' && <DevModeBanner />}
      <header className="zh-header">
        <div className="zh-wrap zh-header-inner">
          <AppLink to={ROUTES.publicHome} aria-label="Zawjan — halaman utama"><Wordmark /></AppLink>
          <nav className="zh-header-nav" aria-label="Navigasi publik">
            {sectionLinks.map(([label, href]) => <a key={href} href={href}>{label}</a>)}
          </nav>
          <div className="zh-header-actions">
            <AppLink to={ROUTES.login}>{c.layout.login}</AppLink>
            <AppLink to={ROUTES.register} className="zh-button zh-button-primary">{c.layout.register}<ArrowUpRight size={15} aria-hidden /></AppLink>
          </div>
        </div>
      </header>

      <main id="main" tabIndex={-1}>
        <section className="zh-hero" aria-labelledby="zh-title">
          <div className="zh-wrap zh-hero-inner">
            <div className="zh-hero-copy">
              <h1 id="zh-title">{c.hero.title}{' '}<em>{c.hero.titleEmphasis}</em></h1>
              <p>{c.hero.body}</p>
              <div className="zh-hero-actions">
                <AppLink to={ROUTES.register} className="zh-button zh-button-primary">{c.hero.primary}<ArrowUpRight size={19} aria-hidden /></AppLink>
                <a href="#simulasi" className="zh-button zh-button-outline">{c.hero.secondary}<ArrowDown size={17} aria-hidden /></a>
              </div>
            </div>
            <figure className="zh-hero-figure">
              <div className="zh-hero-plate">
                <div className="zh-arches" aria-hidden><i /><i /><i /></div>
                <ZawjanMascot className="zh-welcome" pose="welcome" />
              </div>
              <figcaption><span>{c.hero.caption}</span><a href="#simulasi" aria-label="Lompat ke simulasi"><ArrowDown size={19} aria-hidden /></a></figcaption>
            </figure>
          </div>
          <nav className="zh-wrap zh-mobile-nav" aria-label="Bagian halaman">
            {sectionLinks.map(([label, href]) => <a key={href} href={href}>{label}</a>)}
          </nav>
        </section>

        <DemoStory />

        <section id="proses" className="zh-process zh-band" aria-labelledby="proses-title">
          <div className="zh-wrap zh-editorial">
            <div><h2 id="proses-title">{c.process.title}</h2><p>{c.process.lead}</p></div>
            <ol className="zh-index-list">
              {c.process.steps.map((step, i) => (
                <li key={step.title}><span className="zh-number" aria-hidden>{chapterNumber(i)}</span><div><h3>{step.title}</h3><p>{step.body}</p></div></li>
              ))}
            </ol>
          </div>
        </section>

        <section id="privasi" className="zh-privacy zh-band" aria-labelledby="privasi-title">
          <div className="zh-wrap zh-editorial">
            <div><h2 id="privasi-title">{c.privacy.title}</h2><p>{c.privacy.note}</p></div>
            <ul className="zh-index-list">
              {c.privacy.items.map((item) => <li key={item.title}><LockKeyhole size={19} aria-hidden /><div><h3>{item.title}</h3><p>{item.body}</p></div></li>)}
            </ul>
          </div>
        </section>

        <section className="zh-wrap zh-verification zh-band" aria-labelledby="verifikasi-title">
          <h2 id="verifikasi-title">{c.verification.title}</h2>
          <div className="zh-verification-lists">
            <div>
              <h3>{c.verification.checksLabel}</h3>
              <ul>{c.verification.checks.map((item) => <li key={item}><Check size={18} aria-hidden />{item}</li>)}</ul>
            </div>
            <div>
              <h3>{c.verification.notChecksLabel}</h3>
              <ul>{c.verification.notChecks.map((item) => <li key={item}><Minus size={18} aria-hidden />{item}</li>)}</ul>
            </div>
          </div>
          <div className="zh-companion">
            <h3>{c.pendamping.title}</h3>
            <div><p>{c.pendamping.body}</p><p>{c.pendamping.caveat}</p></div>
          </div>
        </section>

        <section id="faq" className="zh-faq zh-band" aria-labelledby="faq-title">
          <div className="zh-wrap zh-editorial">
            <h2 id="faq-title">{c.faq.title}</h2>
            <div className="zh-questions">
              {c.faq.items.map(({ q, a }) => (
                <details key={q}>
                  <summary>{q}<Plus size={20} aria-hidden /></summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="zh-close" aria-labelledby="zh-close-title">
          <div className="zh-wrap zh-close-inner">
            <div>
              <h2 id="zh-close-title">{c.cta.title}</h2>
              <p>{c.cta.body}</p>
              <AppLink to={ROUTES.register} className="zh-button zh-button-primary">{c.cta.button}<ArrowUpRight size={19} aria-hidden /></AppLink>
            </div>
            <div className="zh-close-plate"><ZawjanMascot className="zh-ready" pose="ready" /></div>
          </div>
        </section>
      </main>

      <footer className="zh-footer">
        <div className="zh-wrap">
          <div className="zh-footer-inner">
            <div><AppLink to={ROUTES.publicHome} aria-label="Zawjan — halaman utama"><Wordmark inverse /></AppLink><p>{c.layout.footerAbout}</p></div>
            <div>
              <h2>{c.layout.legal}</h2>
              <details id="syarat"><summary>{c.layout.terms}<Plus size={15} aria-hidden /></summary><p>{c.legal.termsNote}</p></details>
              <details id="kebijakan-privasi"><summary>{c.layout.privacyPolicy}<Plus size={15} aria-hidden /></summary><p>{c.legal.privacyNote}</p></details>
            </div>
            <div><h2>{c.layout.contact}</h2><p>{c.layout.contactNote}</p></div>
          </div>
          <p className="zh-copyright">{c.layout.copyright}</p>
        </div>
      </footer>
    </div>
  );
}
