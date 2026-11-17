"use client";

import { useActionState, useState } from "react";
import { createChallengeAction, createSessionAction, createTournamentAction, type ActionState } from "@/lib/actions/app";
import { useT } from "@/lib/i18n/client";
import type { PublicUser } from "@/lib/services/users";
import { Avatar, Icon } from "./ui";
import { fmt } from "@/lib/i18n";

function Err({ state }: { state: ActionState }) {
  const { t } = useT();
  if (!state?.error) return null;
  return <div className="rounded-xl bg-red-bg text-red-text text-sm font-semibold px-4 py-3">{t.common.error}</div>;
}

function defaultDate() {
  // Prochain jeudi 12:00 (heure locale du navigateur), format datetime-local.
  const d = new Date();
  const day = d.getDay();
  const add = (4 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + add);
  d.setHours(12, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function SessionForm({ defaultLocation }: { defaultLocation: string }) {
  const { t } = useT();
  const [state, action, pending] = useActionState(createSessionAction, null);
  const [local, setLocal] = useState(defaultDate());
  return (
    <form
      action={(fd) => {
        // Convertit la date locale saisie en ISO (UTC) avant envoi.
        fd.set("startsAt", new Date(local).toISOString());
        return action(fd);
      }}
      className="flex flex-col gap-3.5"
    >
      <Err state={state} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="startsAt" className="label">{t.sessions.new.date}</label>
        <input id="startsAt" type="datetime-local" required value={local} onChange={(e) => setLocal(e.target.value)} className="field" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="durationMin" className="label">{t.sessions.new.duration}</label>
          <input id="durationMin" name="durationMin" type="number" min={30} step={15} defaultValue={90} className="field" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="courts" className="label">{t.sessions.new.courts}</label>
          <input id="courts" name="courts" type="number" min={1} max={6} defaultValue={2} className="field" />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="location" className="label">{t.sessions.new.location}</label>
        <input id="location" name="location" type="text" defaultValue={defaultLocation} className="field" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="playtomicUrl" className="label">{t.sessions.new.playtomic}</label>
        <input id="playtomicUrl" name="playtomicUrl" type="url" placeholder="https://app.playtomic.io/…" className="field" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="note" className="label">{t.sessions.new.note}</label>
        <input id="note" name="note" type="text" maxLength={140} className="field" />
      </div>
      <button type="submit" disabled={pending} className="btn bg-red text-white mt-2">
        {pending ? t.common.loading : t.sessions.new.create}
      </button>
    </form>
  );
}

function PlayerSelect({ name, label, players, exclude, value, onChange, required }: { name: string; label: string; players: PublicUser[]; exclude: string[]; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="label">{label}</label>
      <select id={name} name={name} required={required} value={value} onChange={(e) => onChange(e.target.value)} className="field appearance-none">
        <option value="">—</option>
        {players
          .filter((p) => !exclude.includes(p.id) || p.id === value)
          .map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.elo})
            </option>
          ))}
      </select>
    </div>
  );
}

export function ChallengeForm({ players, meId, presetTo }: { players: PublicUser[]; meId: string; presetTo: string[] }) {
  const { t } = useT();
  const [state, action, pending] = useActionState(createChallengeAction, null);
  const [from2, setFrom2] = useState("");
  const [to1, setTo1] = useState(presetTo[0] ?? "");
  const [to2, setTo2] = useState(presetTo[1] ?? "");
  const others = players.filter((p) => p.id !== meId);
  const taken = [from2, to1, to2].filter(Boolean);
  return (
    <form action={action} className="flex flex-col gap-3.5">
      <Err state={state} />
      <PlayerSelect name="from2" label={t.challenges.partner} players={others} exclude={taken} value={from2} onChange={setFrom2} />
      <div className="grid grid-cols-2 gap-3">
        <PlayerSelect name="to1" label={`${t.challenges.opponents} 1`} players={others} exclude={taken} value={to1} onChange={setTo1} required />
        <PlayerSelect name="to2" label={`${t.challenges.opponents} 2`} players={others} exclude={taken} value={to2} onChange={setTo2} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="message" className="label">{t.challenges.message}</label>
        <input id="message" name="message" type="text" maxLength={140} placeholder="…" className="field" />
      </div>
      <button type="submit" disabled={pending || !to1} className="btn bg-red text-white mt-2">
        <Icon name="racket" size={20} />
        {pending ? t.common.loading : t.challenges.send}
      </button>
    </form>
  );
}

export function TournamentForm({ players, meId }: { players: PublicUser[]; meId: string }) {
  const { t } = useT();
  const [state, action, pending] = useActionState(createTournamentAction, null);
  const [selected, setSelected] = useState<string[]>([meId]);
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  return (
    <form action={action} className="flex flex-col gap-3.5">
      <Err state={state} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="label">{t.americano.name}</label>
        <input id="name" name="name" type="text" defaultValue={`Americano`} className="field" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="courts" className="label">{t.americano.courts}</label>
          <input id="courts" name="courts" type="number" min={1} max={6} defaultValue={2} className="field" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="points" className="label">{t.americano.points}</label>
          <input id="points" name="points" type="number" min={8} max={32} step={4} defaultValue={16} className="field" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <div className="label">{fmt(t.americano.players, { n: selected.length })}</div>
        <div className="grid grid-cols-2 gap-2">
          {players.map((p) => {
            const on = selected.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => toggle(p.id)}
                className={`flex items-center gap-2.5 rounded-2xl p-2.5 border text-left ${on ? "bg-blue-bg border-blue" : "bg-surface border-border"}`}
              >
                <Avatar name={p.name} color={p.color} size={32} />
                <div className="text-sm font-extrabold truncate">{p.name}</div>
                {on && <Icon name="check" size={16} className="ml-auto text-blue-text" />}
              </button>
            );
          })}
        </div>
        {selected.map((id) => (
          <input key={id} type="hidden" name="players" value={id} />
        ))}
      </div>
      <p className="text-xs text-muted">{t.americano.howItWorks}</p>
      <button type="submit" disabled={pending || selected.length < 4} className="btn bg-red text-white mt-2">
        {selected.length < 4 ? t.americano.minPlayers : pending ? t.common.loading : t.americano.start}
      </button>
    </form>
  );
}
