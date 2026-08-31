import { Download, Eye, KeyRound, LogOut, Moon, PauseCircle, RotateCcw, Sun, Upload, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../../components/ui/button";
import { FieldLabel, Input, Textarea } from "../../../components/ui/field";
import { ru } from "../../../i18n/ru";
import { downloadBackup } from "../../../services/exportService";
import { noopSyncService } from "../../../services/syncService";
import { useAppStore } from "../../../stores/appStore";
import { logout } from "../../../lib/firebase";
import { motion } from "framer-motion";
import type { PartnerAccessLevel, PartnerSharingPreferences, PartnerSupportPreferences, UserRole } from "../../../types";
import {
  applyPartnerAccessLevel,
  normalizePartnerSharing
} from "../../partner/domain/partnerPermissions";
import { loginWithGoogle } from "../../../lib/firebase";
import { MagicBento, type BentoItem } from "../../../components/ui/MagicBento";



const accessLevels: Array<{ value: PartnerAccessLevel; title: string; text: string }> = [
  { value: "basic", title: "Основная информация", text: "День цикла, фаза, прогноз и общий календарь фаз." },
  { value: "full", title: "Read-only (всё)", text: "Партнёр видит абсолютно всю информацию без права редактирования." }
];

const defaultSupport: PartnerSupportPreferences = {
  preferredSupport: ["Спросить, нужна ли помощь, и не настаивать"],
  avoidWhenPossible: "",
  reassuranceText: "Я рядом, но не буду давить.",
  updatedAt: new Date().toISOString()
};

export function ProfilePage() {
  const {
    authUser,
    profile,
    setTheme,
    setRole,
    updateSharing,
    generatePartnerAccessCode,
    confirmPartnerAccessCode,
    setPartnerAccessPaused,
    disconnectPartner,
    setSupportPreferences,
    setHidePrivateMarkers,
    exportJson,
    importJson,
    clearAll
  } = useAppStore();
  const navigate = useNavigate();
  const [supportDraft, setSupportDraft] = useState<PartnerSupportPreferences>(() => profile?.supportPreferences ?? defaultSupport);
  const [confirmCode, setConfirmCode] = useState("");

  const permissions = useMemo(() => normalizePartnerSharing(profile?.partnerSharing), [profile?.partnerSharing]);

  if (!profile) return null;
  const sync = noopSyncService.getStatus();
  const trackerMode = profile.role !== "partner";

  async function onImport(file?: File) {
    if (!file) return;
    try {
      await importJson(await file.text());
    } catch (error) {
      alert(error instanceof Error ? error.message : "Не удалось импортировать файл");
    }
  }



  function setAccessLevel(level: PartnerAccessLevel) {
    void updateSharing(applyPartnerAccessLevel(level, permissions));
  }

  function saveSupportDraft() {
    void setSupportPreferences({
      ...supportDraft,
      preferredSupport: supportDraft.preferredSupport.map((item) => item.trim()).filter(Boolean),
      updatedAt: new Date().toISOString()
    });
  }

  function returnToTracker() {
    void setRole("tracker").then(() => navigate("/profile"));
  }

  const topItems: BentoItem[] = [
    {
      id: "main-settings",
      className: "h-full",
      content: (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Основное</h2>
          {trackerMode ? (
            <div>
              <FieldLabel htmlFor="role">Роль</FieldLabel>
              <select id="role" className="min-h-12 w-full rounded-2xl border border-border bg-card px-4 text-base" value={profile.role} onChange={(event) => void setRole(event.target.value as UserRole)}>
                <option value="tracker">Я девушка</option>
                <option value="partner">Локальный предпросмотр партнёра</option>
              </select>
            </div>
          ) : (
            <p className="rounded-2xl bg-primarySoft p-3 text-sm text-muted">Открыт локальный read-only режим партнёра. Управление данными и доступом недоступно.</p>
          )}
          <div className="grid gap-2 sm:grid-cols-3">
            <Button variant={profile.theme === "light" ? "primary" : "outline"} onClick={() => void setTheme("light")}><Sun className="h-4 w-4" />Светлая</Button>
            <Button variant={profile.theme === "dark" ? "primary" : "outline"} onClick={() => void setTheme("dark")}><Moon className="h-4 w-4" />Тёмная</Button>
            <Button variant={profile.theme === "system" ? "primary" : "outline"} onClick={() => void setTheme("system")}>Система</Button>
          </div>
          <p className="rounded-2xl bg-primarySoft p-3 text-sm text-muted">{sync.message}</p>
        </div>
      )
    }
  ];

  if (trackerMode) {
    topItems.push({
      id: "backup",
      className: "h-full",
      content: (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Резервная копия</h2>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => {
              const json = exportJson();
              if (json) downloadBackup(json);
            }}><Download className="h-4 w-4" />Экспорт JSON</Button>
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-2xl border border-border px-4 font-semibold hover:bg-primarySoft">
              <Upload className="h-4 w-4" />
              Импорт JSON
              <Input className="sr-only" type="file" accept="application/json" onChange={(event) => void onImport(event.target.files?.[0])} />
            </label>
            {authUser ? (
              <Button variant="outline" onClick={async () => {
                if (confirm("Выйти из аккаунта Google?")) {
                  await logout();
                  window.location.reload();
                }
              }}><LogOut className="h-4 w-4" />Выйти из Google</Button>
            ) : (
              <Button variant="outline" onClick={async () => {
                try {
                  await loginWithGoogle();
                  // appStore will handle auth state change and hydrate from Firebase if needed
                  window.location.reload();
                } catch (error) {
                  alert("Не удалось войти через Google");
                }
              }}>Войти через Google (Синхронизация)</Button>
            )}
            <Button variant="danger" onClick={() => {
              if (confirm("Полностью сбросить LunaPair? Будут удалены профиль, циклы, дневник, настройки, демо-режим, история ассистента и экран приветствия. После этого приложение начнётся заново.")) void clearAll();
            }}><RotateCcw className="h-4 w-4" />Сбросить приложение</Button>
          </div>
          <p className="text-sm text-muted">Партнёрский режим не может экспортировать, импортировать или удалять данные девушки.</p>
        </div>
      )
    });
  } else {
    topItems.push({
      id: "partner-mode",
      className: "h-full",
      content: (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Аккаунт партнёра</h2>
          <p className="text-sm text-muted">В партнёрском режиме недоступно изменение данных девушки.</p>
          <div className="flex flex-wrap gap-3">
            {authUser ? (
              <Button variant="outline" onClick={async () => {
                if (confirm("Выйти из аккаунта Google?")) {
                  await logout();
                  window.location.href = "/";
                }
              }}><LogOut className="h-4 w-4 mr-2" />Выйти из Google</Button>
            ) : null}
            <Button variant="danger" onClick={() => {
              if (confirm("Полностью сбросить приложение и выйти?")) void clearAll();
            }}><RotateCcw className="h-4 w-4 mr-2" />Сбросить приложение</Button>
          </div>
        </div>
      )
    });
  }

  const supportItems: BentoItem[] = [];
  if (trackerMode) {
    supportItems.push({
      id: "support-prefs",
      content: (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Предпочтения поддержки</h2>
          <p className="text-sm text-muted">Эти подсказки помогут партнёру предлагать помощь бережно, без давления.</p>
          <div>
            <FieldLabel htmlFor="support">Что обычно помогает</FieldLabel>
            <Textarea
              id="support"
              value={supportDraft.preferredSupport.join("\n")}
              onChange={(event) => setSupportDraft({ ...supportDraft, preferredSupport: event.target.value.split("\n") })}
              placeholder="Например: предложить чай, взять на себя ужин, дать тишину"
            />
          </div>
          <div>
            <FieldLabel htmlFor="avoid">Чего лучше избегать</FieldLabel>
            <Input id="avoid" value={supportDraft.avoidWhenPossible} onChange={(event) => setSupportDraft({ ...supportDraft, avoidWhenPossible: event.target.value })} />
          </div>
          <div>
            <FieldLabel htmlFor="reassurance">Фраза поддержки</FieldLabel>
            <Input id="reassurance" value={supportDraft.reassuranceText} onChange={(event) => setSupportDraft({ ...supportDraft, reassuranceText: event.target.value })} />
          </div>
          <Button onClick={saveSupportDraft}>Сохранить предпочтения</Button>
        </div>
      )
    });
    
    supportItems.push({
      id: "private-markers",
      content: (
        <>
          <h2 className="text-xl font-bold">Приватные маркеры в твоём календаре</h2>
          <label className="mt-4 flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-border p-3">
            <span>
              <span className="block font-semibold">Скрывать приватные маркеры в календаре</span>
              <span className="text-sm text-muted">Маркер показывает только факт приватной записи, без подробностей.</span>
            </span>
            <input
              type="checkbox"
              checked={profile.hidePrivateMarkers ?? false}
              onChange={(event) => void setHidePrivateMarkers(event.target.checked)}
              className="h-5 w-5 accent-primary"
            />
          </label>
        </>
      )
    });
  }

  const aboutItem: BentoItem = {
    id: "about",
    className: "bg-primarySoft/30",
    content: (
      <div className="space-y-3">
        <h2 className="text-xl font-bold">О приложении</h2>
        <p className="text-muted">LunaPair помогает вести календарь цикла и записывать самочувствие. Расчёты основаны на введённых данных и являются приблизительными. Приложение не является медицинским устройством и не заменяет консультацию специалиста.</p>
        <p className="text-sm text-muted">{ru.medicalWarning}</p>
      </div>
    )
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-3xl font-bold">Профиль</h1>
        <p className="text-muted">Настройки, приватность и резервная копия.</p>
      </header>

      <MagicBento gridClassName="grid-cols-1 lg:grid-cols-2" items={topItems} enableTilt={false} enableMagnetism={false} />

      {trackerMode ? (
        <PartnerAccessSettings
          permissions={permissions}
          onLevel={setAccessLevel}
          inviteCode={profile.partnerInviteCode}
          inviteConfirmed={profile.partnerInviteConfirmed ?? false}
          confirmCode={confirmCode}
          setConfirmCode={setConfirmCode}
          onGenerateCode={() => void generatePartnerAccessCode().then((code) => {
            if (code) setConfirmCode(code);
          })}
          onConfirmCode={() => void confirmPartnerAccessCode(confirmCode)}
          onPreview={() => navigate("/partner")}
          onPause={(paused) => void setPartnerAccessPaused(paused)}
          onDisconnect={() => {
            if (confirm("Отключить партнёрский доступ? В локальном preview партнёр перестанет видеть новые данные.")) void disconnectPartner();
          }}
        />
      ) : null}

      {trackerMode && supportItems.length > 0 ? (
        <MagicBento gridClassName="grid-cols-1 md:grid-cols-2" items={supportItems} enableTilt={false} enableMagnetism={false} />
      ) : null}

      <MagicBento gridClassName="grid-cols-1" items={[aboutItem]} enableTilt={false} enableMagnetism={false} />
    </div>
  );
}

function PartnerAccessSettings({
  permissions,
  onLevel,
  inviteCode,
  inviteConfirmed,
  confirmCode,
  setConfirmCode,
  onGenerateCode,
  onConfirmCode,
  onPreview,
  onPause,
  onDisconnect
}: {
  permissions: PartnerSharingPreferences;
  onLevel: (level: PartnerAccessLevel) => void;
  inviteCode?: string;
  inviteConfirmed: boolean;
  confirmCode: string;
  setConfirmCode: (code: string) => void;
  onGenerateCode: () => void;
  onConfirmCode: () => void;
  onPreview: () => void;
  onPause: (paused: boolean) => void;
  onDisconnect: () => void;
}) {
  return (
    <MagicBento
      gridClassName="grid-cols-1"
      enableTilt={false}
      enableMagnetism={false}
      items={[{
        id: "partner-settings",
        className: "bg-primarySoft/30",
        content: (
          <div className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">Что увидит партнёр</h2>
                <p className="mt-2 text-sm text-muted">Ты можешь изменить или отозвать доступ в любой момент.</p>
              </div>
              <Button onClick={onPreview}><Eye className="h-4 w-4" />Посмотреть глазами партнёра</Button>
            </div>

      <section className="grid gap-3 rounded-card border border-border bg-card/80 p-4 md:grid-cols-[1fr_auto]">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-bold"><KeyRound className="h-5 w-5 text-primary" />Ключ подключения</h3>
          <p className="mt-1 text-sm text-muted">
            Сгенерируй код и отправь его партнёру. Как только партнёр введёт код в своём приложении, этот экран автоматически обновится.
          </p>
          {inviteCode ? (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                void navigator.clipboard.writeText(inviteCode);
                useAppStore.setState({ toast: "Код скопирован" });
              }}
              className="mt-3 inline-flex rounded-2xl border border-border bg-primarySoft px-4 py-3 text-2xl font-bold tracking-[0.28em] text-primary transition-colors hover:bg-primary/20 cursor-pointer"
            >
              {inviteCode}
            </motion.button>
          ) : (
            <p className="mt-3 rounded-2xl bg-primarySoft p-3 text-sm text-muted">Ключ ещё не создан.</p>
          )}
        </div>
        <div className="flex flex-col gap-2 md:min-w-56">
          <Button variant="outline" onClick={onGenerateCode}><KeyRound className="h-4 w-4" />Сгенерировать ключ</Button>
          <span className={`rounded-2xl px-3 py-2 text-sm font-semibold ${inviteConfirmed ? "bg-success/15 text-success" : "bg-primarySoft text-muted"}`}>
            {inviteConfirmed ? "Ключ подтверждён" : "Ожидает подтверждения"}
          </span>
        </div>
      </section>

      <div className="grid gap-3 grid-cols-2">
        {accessLevels.map((level) => (
          <button
            key={level.value}
            type="button"
            aria-pressed={permissions.accessLevel === level.value}
            className={`rounded-2xl border p-4 text-left transition-all ${permissions.accessLevel === level.value ? "border-primary bg-primarySoft text-primary shadow-sm" : "border-border bg-card"}`}
            onClick={() => onLevel(level.value)}
          >
            <span className="block font-bold text-sm">{level.title}</span>
            <span className="mt-1 block text-xs text-muted">{level.text}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-border p-3">
          <span>
            <span className="flex items-center gap-2 font-semibold text-sm"><PauseCircle className="h-4 w-4 text-primary" />Приостановить доступ</span>
            <span className="text-xs text-muted">Партнёр увидит только сообщение о паузе.</span>
          </span>
          <input type="checkbox" checked={permissions.accessPaused} onChange={(event) => onPause(event.target.checked)} className="h-5 w-5 accent-primary" />
        </label>
        <button type="button" className="rounded-2xl border border-coral/40 p-3 text-left hover:bg-coral/10" onClick={onDisconnect}>
          <span className="flex items-center gap-2 font-semibold text-coral text-sm"><XCircle className="h-4 w-4" />Отключить партнёра</span>
          <span className="mt-1 block text-xs text-muted">Партнёр перестанет видеть данные.</span>
        </button>
      </div>
          </div>
        )
      }]}
    />
  );
}
