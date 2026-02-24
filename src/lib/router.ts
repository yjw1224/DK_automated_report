export type RouteName = 'home' | 'personnel' | 'message' | 'load';

export interface ReportContext {
  battery: string;
  room: string;
  reportDate: string;
}

const ROUTE_PATHS: Record<RouteName, string> = {
  home: '/',
  personnel: '/personnel',
  message: '/message',
  load: '/load'
};

const PATH_TO_ROUTE: Record<string, RouteName> = {
  '/': 'home',
  '/personnel': 'personnel',
  '/message': 'message',
  '/load': 'load'
};

export function buildHash(route: RouteName, context: ReportContext): string {
  const params = new URLSearchParams({
    battery: context.battery,
    room: context.room,
    reportDate: context.reportDate
  });

  return `#${ROUTE_PATHS[route]}?${params.toString()}`;
}

export function parseHash(hash: string): { route: RouteName; context: Partial<ReportContext> } {
  const raw = hash.replace(/^#/, '') || '/';
  const [path, query = ''] = raw.split('?');
  const route = PATH_TO_ROUTE[path] ?? 'home';
  const params = new URLSearchParams(query);

  return {
    route,
    context: {
      battery: params.get('battery') ?? undefined,
      room: params.get('room') ?? undefined,
      reportDate: params.get('reportDate') ?? undefined
    }
  };
}
