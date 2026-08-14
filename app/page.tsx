"use client";

import { FormEvent, KeyboardEvent, useMemo, useState } from "react";

type Answers = {
  name: string;
  whatsapp: string;
  situation: string;
  profession: string;
  englishHistory: string;
  previousInvestment: string;
  fluencyDeadline: string;
  website: string;
};

type ChoiceKey = keyof Pick<Answers, "situation" | "profession" | "englishHistory" | "previousInvestment" | "fluencyDeadline">;

type LeadSession = {
  leadId: number;
  updateToken: string;
};

type Step = {
  key: keyof Answers;
  eyebrow: string;
  title: string;
  helper: string;
  type: "text" | "tel" | "choice";
  options?: string[];
};

const STEPS: Step[] = [
  { key: "name", eyebrow: "QUERO TE CONHECER", title: "Como posso chamar você?", helper: "Quero conversar com você de uma forma mais próxima.", type: "text" },
  { key: "whatsapp", eyebrow: "SEU MELHOR CONTATO", title: "Qual é o seu WhatsApp?", helper: "Coloque seu número com DDD. Assim consigo te enviar os próximos passos.", type: "tel" },
  {
    key: "situation",
    eyebrow: "SEU MOMENTO",
    title: "Qual cenário mais combina com você hoje?",
    helper: "Quero entender qual situação mais se parece com a sua hoje.",
    type: "choice",
    options: ["Já moro fora", "Vou morar fora em breve", "Viajo a trabalho", "Vou viajar em breve"],
  },
  {
    key: "profession",
    eyebrow: "SUA ROTINA",
    title: "Qual é a sua ocupação hoje?",
    helper: "Isso me ajuda a entender como o inglês se encaixa na sua rotina.",
    type: "choice",
    options: ["Empresário(a)", "Liberal ou autônomo(a)", "CLT", "Estudante"],
  },
  {
    key: "englishHistory",
    eyebrow: "SUA EXPERIÊNCIA",
    title: "Você já tentou aprender inglês antes?",
    helper: "Quero conhecer um pouco do seu histórico com o idioma.",
    type: "choice",
    options: ["Sim, várias vezes", "Sim, mas parei no caminho", "Estou estudando atualmente", "Não, seria minha primeira vez"],
  },
  {
    key: "previousInvestment",
    eyebrow: "SEU HISTÓRICO",
    title: "Você já investiu em algum curso de inglês?",
    helper: "Pode responder com sinceridade. Quero entender o que você já buscou.",
    type: "choice",
    options: ["Sim, mais de uma vez", "Sim, uma vez", "Ainda não, mas quero", "Nunca foi prioridade"],
  },
  {
    key: "fluencyDeadline",
    eyebrow: "SEU OBJETIVO",
    title: "Em quanto tempo você quer conquistar sua fluência?",
    helper: "Escolha o prazo que mais combina com o que você quer alcançar.",
    type: "choice",
    options: ["O mais rápido possível", "Em algumas semanas", "Até 3 meses", "Até 1 ano", "Sem prazo definido"],
  },
];

const EMPTY_ANSWERS: Answers = {
  name: "",
  whatsapp: "",
  situation: "",
  profession: "",
  englishHistory: "",
  previousInvestment: "",
  fluencyDeadline: "",
  website: "",
};

const GROUP_FALLBACK_URL = "https://chat.whatsapp.com/CNnC62u0aRHJJmwNMsKdXI";

type StudentVideo = { src: string; name: string; result: string; poster?: string };
type StudentMessage = { src: string; alt: string };

// Os vídeos de depoimento serão adicionados aqui assim que os arquivos forem enviados.
const STUDENT_VIDEOS: StudentVideo[] = [];
const STUDENT_MESSAGES: StudentMessage[] = [
  { src: "/depoimentos/depoimento-2.jpeg", alt: "Aluna conta que teve o visto de Au Pair aprovado com entrevista 100% em inglês e vai morar na Califórnia" },
  { src: "/depoimentos/depoimento-5.jpeg", alt: "Aluno relata ter chegado em Miami se sentindo fluente graças ao método" },
  { src: "/depoimentos/depoimento-3.jpeg", alt: "Aluna diz que nunca imaginou que o inglês entraria tão fácil na cabeça dela com o método" },
  { src: "/depoimentos/depoimento-1.jpeg", alt: "Aluno pede para reunir todos os materiais porque está ficando fluente com o método" },
  { src: "/depoimentos/depoimento-4.jpeg", alt: "Comentário no Instagram dizendo que aprendeu mais em um vídeo do que em meses de curso na Wizard" },
];

export default function Home() {
  const [started, setStarted] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>(EMPTY_ANSWERS);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [groupUrl, setGroupUrl] = useState("");
  const [leadSession, setLeadSession] = useState<LeadSession | null>(null);
  const groupDestination = groupUrl || GROUP_FALLBACK_URL;

  const step = STEPS[stepIndex];
  const progress = ((stepIndex + 1) / STEPS.length) * 100;
  const currentValue = answers[step.key];
  const canAdvance = useMemo(() => {
    if (step.key === "name") return answers.name.trim().length >= 2;
    if (step.key === "whatsapp") return answers.whatsapp.replace(/\D/g, "").length >= 10;
    return Boolean(currentValue);
  }, [answers.name, answers.whatsapp, currentValue, step.key]);

  function update(key: keyof Answers, value: string) {
    setAnswers((current) => ({ ...current, [key]: value }));
    setError("");
  }

  function next() {
    if (!canAdvance || status === "sending") return;
    setDirection("forward");
    setStepIndex((current) => Math.min(current + 1, STEPS.length - 1));
  }

  function back() {
    if (status === "sending") return;
    setError("");
    if (stepIndex === 0) {
      setStarted(false);
      return;
    }
    setDirection("back");
    setStepIndex((current) => current - 1);
  }

  async function persistProgress(payload: Answers, lastStep: number) {
    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...payload, ...leadSession, lastStep }),
    });
    const result = (await response.json()) as { error?: string; leadId?: number; updateToken?: string; groupUrl?: string };
    if (!response.ok || !result.leadId || !result.updateToken) {
      throw new Error(result.error || "Não foi possível salvar seus dados.");
    }
    const session = { leadId: result.leadId, updateToken: result.updateToken };
    setLeadSession(session);
    return result;
  }

  async function saveContactAndAdvance() {
    if (!canAdvance || status === "sending") return;
    setStatus("sending");
    setError("");
    try {
      await persistProgress(answers, 2);
      setStatus("idle");
      setDirection("forward");
      setStepIndex(2);
    } catch (saveError) {
      setStatus("error");
      setError(saveError instanceof Error ? saveError.message : "Não foi possível salvar seus dados.");
    }
  }

  async function choose(key: ChoiceKey, value: string) {
    if (status === "sending") return;
    const nextAnswers = { ...answers, [key]: value };
    setAnswers(nextAnswers);
    setStatus("sending");
    setError("");

    try {
      await new Promise((resolve) => window.setTimeout(resolve, 180));
      const result = await persistProgress(nextAnswers, stepIndex + 1);
      if (stepIndex === STEPS.length - 1) {
        setGroupUrl(result.groupUrl || "");
        setStatus("done");
      } else {
        setStatus("idle");
        setDirection("forward");
        setStepIndex((current) => current + 1);
      }
    } catch (saveError) {
      setStatus("error");
      setError(saveError instanceof Error ? saveError.message : "Não foi possível salvar sua resposta.");
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (stepIndex === 1) void saveContactAndAdvance();
    else next();
  }

  function handleKeys(event: KeyboardEvent<HTMLElement>) {
    if (!started || status === "done") return;
    if (event.key === "Escape" || event.key === "ArrowLeft") back();
    if (event.key === "Enter" && step.type !== "choice") {
      event.preventDefault();
      if (stepIndex === 1) void saveContactAndAdvance();
      else next();
    }
    if (step.type === "choice") {
      const optionIndex = ["1", "2", "3", "4", "5", "a", "b", "c", "d", "e"].indexOf(event.key.toLowerCase());
      const normalizedIndex = optionIndex > 4 ? optionIndex - 5 : optionIndex;
      const option = step.options?.[normalizedIndex];
      if (option) void choose(step.key as ChoiceKey, option);
    }
  }

  if (!started) {
    return (
      <main className="flow-welcome">
        <header className="flow-brand"><span>TF</span><div>TIAGO <strong>FLUÊNCIA</strong></div></header>
        <section className="welcome-content">
          <p className="flow-eyebrow">QUERO TE CONHECER MELHOR</p>
          <h1>Quero entender o seu momento <em>com o inglês.</em></h1>
          <p>Separei 7 perguntas rápidas para entender onde você está e como eu posso te ajudar a avançar.</p>
          <button className="flow-primary" type="button" onClick={() => setStarted(true)}>Responder agora <span>→</span></button>
          <small>Leva menos de 2 minutos</small>
        </section>
        <div className="welcome-orbit" aria-hidden="true"><span>HELLO</span><b>READY?</b></div>
      </main>
    );
  }

  if (status === "done") {
    return (
      <main className="group-landing" aria-live="polite">
        <header className="group-header">
          <div className="flow-brand"><span>TF</span><div>TIAGO <strong>FLUÊNCIA</strong></div></div>
          <a href={groupDestination}>ENTRAR NO GRUPO <b>→</b></a>
        </header>

        <section className="group-hero">
          <div className="group-hero-copy">
            <div className="group-complete"><span>✓</span> RESPOSTAS RECEBIDAS</div>
            <p className="group-kicker">{answers.name.split(" ")[0]}, TENHO UM CONVITE PARA VOCÊ</p>
            <h1>Converse em inglês fluente <em>como um americano</em> em 90 dias.</h1>
            <p className="group-lead">Entre no meu grupo gratuito no WhatsApp. Eu vou compartilhar dicas práticas e enviar por lá o acesso ao meu <strong>Aulão Gratuito de Inglês, dia 20/08.</strong></p>
            <a className="group-main-cta" href={groupDestination}>
              <span>
                <small>CLIQUE PARA ENTRAR AGORA</small>
                <strong>QUERO ENTRAR NO GRUPO GRATUITO</strong>
              </span>
              <b aria-hidden="true">→</b>
            </a>
            <div className="group-trust"><span>✓ 100% gratuito</span><span>✓ Acesso pelo WhatsApp</span><span>✓ Dicas práticas</span></div>
          </div>

          <aside className="group-event-card" aria-label="Aulão gratuito de inglês no dia 20 de agosto">
            <div className="group-event-date"><small>AGOSTO</small><strong>20</strong><span>QUINTA-FEIRA</span></div>
            <div className="group-event-info">
              <p>AULA ESPECIAL</p>
              <h2>AULÃO<br /><em>GRATUITO</em><br />DE INGLÊS</h2>
              <span>O acesso será enviado somente no grupo.</span>
            </div>
          </aside>
        </section>

        <section className="group-why group-section">
          <div className="group-section-heading">
            <p>O QUE EU PREPAREI PARA VOCÊ</p>
            <h2>Inglês útil para a vida real, sem complicação.</h2>
          </div>
          <div className="group-value-grid">
            <article><span>01</span><h3>Dicas que você aplica</h3><p>Conteúdos diretos para entender, falar e usar o inglês no seu dia a dia.</p></article>
            <article><span>02</span><h3>Aulão gratuito</h3><p>No dia 20/08, vou te mostrar como começar a destravar o inglês de forma prática.</p></article>
            <article><span>03</span><h3>Próximos passos</h3><p>Você recebe os avisos, materiais e orientações diretamente pelo WhatsApp.</p></article>
          </div>
          <a className="group-inline-cta" href={groupDestination}>ENTRAR NO GRUPO GRATUITO <b>→</b></a>
        </section>

        {(STUDENT_VIDEOS.length > 0 || STUDENT_MESSAGES.length > 0) && (
          <section className="group-proof group-section">
            <div className="group-section-heading">
              <p>RESULTADOS REAIS</p>
              <h2>Veja quem já começou a destravar o inglês comigo.</h2>
            </div>
            {STUDENT_VIDEOS.length > 0 && (
              <div className="group-video-grid">
                {STUDENT_VIDEOS.map((testimonial) => (
                  <article key={testimonial.src}>
                    <video controls playsInline preload="metadata" poster={testimonial.poster}>
                      <source src={testimonial.src} />
                    </video>
                    <div><strong>{testimonial.name}</strong><span>{testimonial.result}</span></div>
                  </article>
                ))}
              </div>
            )}
            {STUDENT_MESSAGES.length > 0 && (
              <div className="group-message-grid">
                {STUDENT_MESSAGES.map((message) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={message.src} src={message.src} alt={message.alt} loading="lazy" />
                ))}
              </div>
            )}
            <a className="group-inline-cta" href={groupDestination}>QUERO COMEÇAR AGORA <b>→</b></a>
          </section>
        )}

        <section className="group-about">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="group-about-photo" src="/tiago-foto.jpg" alt="Foto do professor Tiago" />
          <div className="group-about-copy">
            <p>QUEM VAI TE ENSINAR</p>
            <h2>Prazer, eu sou o Tiago.</h2>
            <p>Morei nos Estados Unidos dos 7 aos 18 anos. Cresci ouvindo, pensando e vivendo em inglês, o inglês real do dia a dia, não aquele inglês engessado dos livros.</p>
            <p>Foi por isso que desenvolvi um método pautado para você falar como um americano, de forma fluente. Sem tradução, sem decoreba, sem gramática cansativa.</p>
            <p>Quero te levar para dentro do meu grupo gratuito e começar essa jornada com você.</p>
            <a href={groupDestination}>QUERO APRENDER COM O TIAGO <b>→</b></a>
          </div>
        </section>

        <section className="group-final">
          <p>O AULÃO ACONTECE DIA 20/08</p>
          <h2>Não deixe o inglês continuar adiando suas oportunidades.</h2>
          <span>Entre agora no grupo para receber o acesso, os avisos e minhas dicas gratuitas.</span>
          <a className="group-main-cta" href={groupDestination}>
            <span><small>ENTRAR PELO WHATSAPP</small><strong>QUERO GARANTIR MEU ACESSO GRATUITO</strong></span>
            <b aria-hidden="true">→</b>
          </a>
          <small>Ao clicar, você será direcionado para o grupo gratuito no WhatsApp.</small>
        </section>

        <a className="group-mobile-sticky" href={groupDestination}>ENTRAR NO GRUPO GRATUITO <b>→</b></a>
      </main>
    );
  }

  return (
    <main className="flow-shell" onKeyDown={handleKeys}>
      <header className="flow-topbar">
        <div className="flow-brand dark"><span>TF</span><div>TIAGO <strong>FLUÊNCIA</strong></div></div>
        <div className="flow-counter"><b>{String(stepIndex + 1).padStart(2, "0")}</b> / {String(STEPS.length).padStart(2, "0")}</div>
      </header>
      <div className="flow-progress"><span style={{ width: `${progress}%` }} /></div>

      <form className="flow-question-wrap" onSubmit={handleSubmit}>
        <section className={`flow-question-card flow-${direction}`} key={stepIndex}>
          <p className="flow-eyebrow">{step.eyebrow}</p>
          <h1>{step.title}</h1>
          <p className="flow-helper">{step.helper}</p>

          {step.type !== "choice" ? (
            <>
              <label className="flow-sr-only" htmlFor={step.key}>{step.title}</label>
              <input autoFocus className="flow-input" id={step.key} name={step.key} type={step.type} inputMode={step.type === "tel" ? "tel" : "text"} autoComplete={step.type === "tel" ? "tel" : "name"} placeholder={step.type === "tel" ? "(11) 99999-9999" : "Digite seu nome"} value={currentValue} onChange={(event) => update(step.key, event.target.value)} />
              <div className="flow-actions">
                <button className="flow-next" type="submit" disabled={!canAdvance}>Continuar <span>→</span></button>
                <small>pressione <kbd>Enter ↵</kbd></small>
              </div>
            </>
          ) : (
            <div className="flow-options">
              {step.options?.map((option, index) => (
                <button className={`flow-option ${currentValue === option ? "selected" : ""}`} type="button" key={option} disabled={status === "sending"} onClick={() => void choose(step.key as ChoiceKey, option)}>
                  <span className="flow-option-key">{String.fromCharCode(65 + index)}</span>
                  <span>{option}</span>
                  <b>{currentValue === option ? "✓" : ""}</b>
                </button>
              ))}
            </div>
          )}

          {status === "sending" && <p className="flow-sending">Salvando seus dados...</p>}
          {error && <div className="flow-error" role="alert"><span>{error}</span><button type="button" onClick={() => stepIndex === 1 ? void saveContactAndAdvance() : void choose(step.key as ChoiceKey, currentValue)}>Tentar novamente</button></div>}
        </section>
      </form>

      <footer className="flow-footer">
        <button type="button" onClick={back} disabled={status === "sending"}>← Voltar</button>
        <span>Seus dados estão seguros.</span>
      </footer>
    </main>
  );
}
