import { Component, type ErrorInfo, type ReactNode } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // Ошибка намеренно не отправляется во внешние сервисы: приложение работает локально.
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <main className="app-safe-area flex min-h-dvh items-center justify-center py-5">
        <Card className="max-w-md space-y-4">
          <h1 className="text-2xl font-bold">Что-то пошло не так</h1>
          <p className="text-muted">
            Не удалось прочитать локальные данные. Перезагрузи приложение или восстанови данные из резервной копии.
          </p>
          <Button onClick={() => window.location.reload()}>Перезагрузить</Button>
        </Card>
      </main>
    );
  }
}
