# Аудит мобильной PWA-адаптации LunaPair

Дата аудита: 2026-07-17.

## Текущий стек

- React, TypeScript strict, Vite.
- React Router для маршрутизации.
- Zustand для состояния приложения.
- Dexie / IndexedDB для локальных пользовательских данных.
- Tailwind CSS, Lucide React, Recharts, Framer Motion.
- `vite-plugin-pwa` для manifest, service worker и offline precache.

## Найденные проблемы

- Manifest уже был подключён, но не содержал `display_override`, `orientation`, `categories` и тёмные standalone-цвета, которые лучше подходят для установленного мобильного приложения.
- В `index.html` не хватало iOS mobile web app meta-тегов: `apple-mobile-web-app-capable`, `apple-mobile-web-app-title`, `apple-mobile-web-app-status-bar-style`, `format-detection`.
- Desktop sidebar включался уже на `md`, из-за чего tablet-ширины могли ощущаться как сжатый desktop.
- Общий layout использовал `h-screen` / `min-h-screen`; на мобильных браузерах это может давать неверную высоту из-за динамических панелей браузера и клавиатуры.
- `html` и `body` имели `min-width: 320px`; на очень узких webview это может становиться причиной горизонтальной прокрутки.
- Нижняя навигация не была вынесена в общий размер-токен и не полностью учитывала safe-area в расчёте отступов контента и toast.
- Поля ввода и select не гарантировали `16px` на mobile, что может вызывать автоматический zoom на iOS.
- Calendar legend и DayEditor bottom sheet имели ограничения высоты через `vh`, не через `dvh`, и не полностью учитывали safe-area.
- Некоторые группы на главной странице могли оставаться в две колонки на узких экранах.

## Причины

- Интерфейс был responsive, но не полностью mobile-first.
- Safe-area учитывалась точечно, а не как системные CSS-переменные.
- PWA-настройки были базовыми и больше подходили для web-страницы, чем для установленного приложения.
- Sticky/fixed элементы не имели единой модели отступов от нижней навигации и нижнего индикатора iPhone.

## План исправлений

- Расширить manifest до standalone PWA с `display_override`, `orientation`, категориями и тёмными цветами запуска.
- Добавить mobile web app meta-теги для iOS и общий `apple-touch-icon`.
- Перевести layout на `100dvh`, safe-area переменные и desktop sidebar только с `lg`.
- Оставить нижнюю навигацию для mobile/tablet, desktop sidebar — для desktop.
- Убрать потенциальные источники горизонтального overflow.
- Сделать поля ввода и select 16px на mobile.
- Адаптировать DayEditor и Calendar legend как safe-area-aware bottom sheets.
- Обновить boot splash внутри приложения.
- Проверить mobile viewport, desktop viewport, offline/PWA build и отсутствие ошибок консоли.

## Затронутые файлы

- `vite.config.ts`
- `index.html`
- `src/app/styles/global.css`
- `src/app/App.tsx`
- `src/components/layout/AppLayout.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/field.tsx`
- `src/components/ui/toast.tsx`
- `src/features/cycle/pages/CalendarPage.tsx`
- `src/features/cycle/pages/TodayPage.tsx`
- `src/features/daily-log/components/DayEditor.tsx`
- `src/features/onboarding/pages/OnboardingPage.tsx`
- `src/features/profile/pages/ProfilePage.tsx`
