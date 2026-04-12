import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Clock3,
  MapPin,
  MoreHorizontal,
  Pencil,
  Plus,
  Theater,
  Music2,
  PartyPopper,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { dataService } from '../services/api';
import { CalendarEvent, CalendarEventType, CreateCalendarEventDto, UpdateCalendarEventDto } from '../types';
import Layout from './Layout';

type CalendarFilter = 'todos' | CalendarEventType;
type CalendarViewMode = 'month' | 'week' | 'day';

const monthTitleFormatter = new Intl.DateTimeFormat('es-AR', {
  month: 'long',
  year: 'numeric',
});

const weekdayFormatter = new Intl.DateTimeFormat('es-AR', { weekday: 'short' });
const dayFormatter = new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit' });
const timeFormatter = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' });
const dayTitleFormatter = new Intl.DateTimeFormat('es-AR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const sameDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const sameMonth = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();

const startOfMonthGrid = (month: Date) => {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  return addDays(firstDay, -firstDay.getDay());
};

const buildMonthCells = (month: Date) => {
  const start = startOfMonthGrid(month);
  return Array.from({ length: 35 }, (_, index) => addDays(start, index));
};

const startOfWeek = (date: Date) => addDays(date, -date.getDay());
const buildWeekCells = (date: Date) => {
  const start = startOfWeek(date);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
};

const toLocalDateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const toHourSlotKey = (date: Date, hour: number) => `${toLocalDateKey(date)}-${String(hour).padStart(2, '0')}`;

const getTypeTheme = (type: CalendarEventType) => {
  if (type === 'ensayo') {
    return {
      pill: 'bg-blue-500/10 text-blue-300',
      chip: 'bg-blue-500/10 border-l-4 border-blue-400 text-blue-300',
      solid: 'bg-blue-600 text-white shadow-lg shadow-blue-900/30',
      icon: <Music2 size={16} />,
      label: 'Ensayo',
    };
  }

  if (type === 'concierto') {
    return {
      pill: 'bg-violet-500/10 text-violet-300',
      chip: 'bg-violet-500/10 border-l-4 border-violet-400 text-violet-300',
      solid: 'bg-violet-500 text-white shadow-lg shadow-violet-900/30',
      icon: <Theater size={16} />,
      label: 'Concierto',
    };
  }

  if (type === 'social') {
    return {
      pill: 'bg-pink-500/10 text-pink-300',
      chip: 'bg-pink-500/10 border-l-4 border-pink-400 text-pink-300',
      solid: 'bg-pink-500 text-white shadow-lg shadow-pink-900/30',
      icon: <PartyPopper size={16} />,
      label: 'Social',
    };
  }

  return {
    pill: 'bg-teal-500/10 text-teal-300',
    chip: 'bg-teal-500/10 border-l-4 border-teal-400 text-teal-300',
    solid: 'bg-teal-500 text-white shadow-lg shadow-teal-900/30',
    icon: <Users size={16} />,
    label: 'Seccional',
  };
};

type CalendarEventViewModel = Omit<CalendarEvent, 'start' | 'end'> & {
  start: Date;
  end?: Date;
};

const emptyEventForm = {
  title: '',
  subtitle: '',
  type: 'ensayo' as CalendarEventType,
  startDate: '',
  startTime: '18:00',
  endDate: '',
  endTime: '20:00',
  location: '',
  tag: '',
  attendees: '',
  description: '',
};

const toDateInputValue = (date?: Date) => (date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : '');
const toTimeInputValue = (date?: Date) => (date ? `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}` : '');

const toViewModel = (event: CalendarEvent): CalendarEventViewModel => ({
  ...event,
  start: new Date(event.start),
  end: event.end ? new Date(event.end) : undefined,
});

const buildMockEvents = (month: Date): CalendarEventViewModel[] => {
  const year = month.getFullYear();
  const currentMonth = month.getMonth();

  const makeDate = (day: number, hour: number, minute: number) => new Date(year, currentMonth, day, hour, minute, 0, 0);

  return [
    {
      id: 'ensayo-cuerdas-1',
      title: 'Cuerdas: Mozart',
      subtitle: 'Lectura de repertorio',
      type: 'ensayo',
      start: makeDate(2, 18, 0),
      end: makeDate(2, 20, 30),
      location: 'Sala de Ensayo A',
      attendees: ['LP', 'TM', 'CR'],
    },
    {
      id: 'seccional-vientos',
      title: 'Vientos Madera',
      subtitle: 'Trabajo por sección',
      type: 'seccional',
      start: makeDate(4, 17, 0),
      end: makeDate(4, 19, 0),
      location: 'Aula 2',
      attendees: ['VC', 'MN'],
    },
    {
      id: 'tutti-general',
      title: 'Ensayo General',
      subtitle: 'Preparación para concierto',
      type: 'ensayo',
      start: makeDate(5, 18, 0),
      end: makeDate(5, 21, 0),
      location: 'Auditorio Principal',
      tag: 'Tutti',
      attendees: ['LP', 'TM', 'CR', 'VC', 'MN'],
    },
    {
      id: 'social-pizza',
      title: 'Noche de Pizza',
      subtitle: 'Encuentro del grupo',
      type: 'social',
      start: makeDate(7, 20, 0),
      end: makeDate(7, 23, 0),
      location: 'Casa de Juan',
      attendees: ['JP', 'LM', 'AB'],
    },
    {
      id: 'ensayo-cuerdas-2',
      title: 'Cuerdas: Beethoven',
      subtitle: 'Pulido de dinámica',
      type: 'ensayo',
      start: makeDate(9, 18, 0),
      end: makeDate(9, 20, 0),
      location: 'Sala B',
      attendees: ['LP', 'TM'],
    },
    {
      id: 'ensayo-tutti-repaso',
      title: 'Tutti: Repaso',
      subtitle: 'Repaso final',
      type: 'ensayo',
      start: makeDate(12, 18, 0),
      end: makeDate(12, 20, 30),
      location: 'Auditorio Principal',
      attendees: ['LP', 'TM', 'CR', 'VC'],
    },
    {
      id: 'concierto-gala',
      title: 'Gala de Otoño',
      subtitle: 'Concierto principal del mes',
      type: 'concierto',
      start: makeDate(13, 19, 30),
      end: makeDate(13, 22, 0),
      location: 'Teatro Municipal',
      attendees: ['LP', 'TM', 'CR', 'VC', 'MN', 'AB'],
    },
  ];
};

const EventCalendar: React.FC = () => {
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [activeFilter, setActiveFilter] = useState<CalendarFilter>('todos');
  const [events, setEvents] = useState<CalendarEventViewModel[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [usingMockData, setUsingMockData] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState(emptyEventForm);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [draggedEventId, setDraggedEventId] = useState<string | null>(null);
  const [dragOverTargetKey, setDragOverTargetKey] = useState<string | null>(null);

  const monthCells = buildMonthCells(visibleMonth);
  const weekCells = buildWeekCells(visibleMonth);
  const monthKey = `${visibleMonth.getFullYear()}-${String(visibleMonth.getMonth() + 1).padStart(2, '0')}`;
  const weekRangeLabel = `${dayFormatter.format(weekCells[0])} - ${dayFormatter.format(weekCells[6])}`;

  useEffect(() => {
    let cancelled = false;

    const loadEvents = async () => {
      setLoadingEvents(true);
      try {
        const apiEvents = await dataService.getEventos({ month: monthKey });
        if (cancelled) return;
        setEvents(Array.isArray(apiEvents) ? apiEvents.map(toViewModel) : []);
        setUsingMockData(false);
      } catch {
        if (cancelled) return;
        setEvents([]);
        setUsingMockData(false);
      } finally {
        if (!cancelled) {
          setLoadingEvents(false);
        }
      }
    };

    loadEvents();

    return () => {
      cancelled = true;
    };
  }, [monthKey]);

  const visibleEvents = activeFilter === 'todos'
    ? events
    : events.filter((event) => event.type === activeFilter);
  const sortedUpcomingEvents = [...visibleEvents].sort((left, right) => left.start.getTime() - right.start.getTime());
  const highlightedEvent = sortedUpcomingEvents[0] || null;
  const upcomingEvents = sortedUpcomingEvents.slice(0, 3);
  // selectedDayEvents: eventos del día visible (en modo día)
  const selectedDayEvents = visibleEvents
    .filter((event) => sameDay(event.start, visibleMonth))
    .sort((left, right) => left.start.getTime() - right.start.getTime());

  const changeMonth = (direction: number) => {
    setVisibleMonth((current) => {
      if (viewMode === 'week') {
        return addDays(current, direction * 7);
      }
      if (viewMode === 'day') {
        return addDays(current, direction);
      }
      return new Date(current.getFullYear(), current.getMonth() + direction, 1);
    });
  };

  const persistMovedEvent = async (eventToMove: CalendarEventViewModel, targetDate: Date, targetHour?: number) => {
    const originalStart = eventToMove.start;
    const originalEnd = eventToMove.end;
    const nextStart = new Date(targetDate);
    nextStart.setHours(targetHour ?? originalStart.getHours(), originalStart.getMinutes(), 0, 0);

    let nextEnd: Date | undefined = undefined;
    if (originalEnd) {
      // Si el evento original era multiday, mantener la duración; si no, mantener la hora de fin en el mismo día
      const originalDuration = originalEnd.getTime() - originalStart.getTime();
      if (
        originalStart.getFullYear() !== originalEnd.getFullYear() ||
        originalStart.getMonth() !== originalEnd.getMonth() ||
        originalStart.getDate() !== originalEnd.getDate()
      ) {
        // Evento multiday: mantener duración
        nextEnd = new Date(nextStart.getTime() + originalDuration);
      } else {
        // Evento de un solo día: mantener la misma duración pero forzar que termine el mismo día
        nextEnd = new Date(nextStart);
        nextEnd.setHours(originalEnd.getHours(), originalEnd.getMinutes(), 0, 0);
        if (nextEnd < nextStart) {
          // Si la hora de fin es anterior a la de inicio, sumar 1 hora por defecto
          nextEnd = new Date(nextStart.getTime() + 60 * 60 * 1000);
        }
      }
    }

    const movedEvent: CalendarEventViewModel = {
      ...eventToMove,
      start: nextStart,
      end: nextEnd,
    };

    setEvents((current) => current
      .map((event) => (event.id === eventToMove.id ? movedEvent : event))
      .sort((a, b) => a.start.getTime() - b.start.getTime()));

    const updated = await dataService.updateEvento(eventToMove.id, {
      id: eventToMove.id,
      title: movedEvent.title,
      subtitle: movedEvent.subtitle,
      type: movedEvent.type,
      start: movedEvent.start.toISOString(),
      end: movedEvent.end?.toISOString(),
      location: movedEvent.location,
      tag: movedEvent.tag,
      attendees: movedEvent.attendees,
      courseId: movedEvent.courseId ?? null,
      description: movedEvent.description,
    } as UpdateCalendarEventDto);

    if (updated) {
      const persisted = toViewModel(updated);
      setEvents((current) => current
        .map((event) => (event.id === eventToMove.id ? persisted : event))
        .sort((a, b) => a.start.getTime() - b.start.getTime()));
      setUsingMockData(false);
    }
  };

  const handleDropOnDay = async (targetDate: Date) => {
    if (!draggedEventId) return;

    const eventToMove = events.find((event) => event.id === draggedEventId);
    setDragOverTargetKey(null);
    setDraggedEventId(null);

    if (!eventToMove || sameDay(eventToMove.start, targetDate)) {
      return;
    }

    try {
      await persistMovedEvent(eventToMove, targetDate);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDropOnHour = async (targetDate: Date, targetHour: number) => {
    if (!draggedEventId) return;

    const eventToMove = events.find((event) => event.id === draggedEventId);
    setDragOverTargetKey(null);
    setDraggedEventId(null);

    if (!eventToMove) {
      return;
    }

    if (sameDay(eventToMove.start, targetDate) && eventToMove.start.getHours() === targetHour) {
      return;
    }

    try {
      await persistMovedEvent(eventToMove, targetDate, targetHour);
    } catch (error) {
      console.error(error);
    }
  };

  const renderEventCard = (event: CalendarEventViewModel, solidCard = false) => {
    const theme = getTypeTheme(event.type);
    return (
      <div
        key={event.id}
        onClick={() => openEditModal(event)}
        draggable={viewMode !== 'day'}
        onDragStart={(dragEvent) => {
          dragEvent.dataTransfer.effectAllowed = 'move';
          setDraggedEventId(event.id);
        }}
        onDragEnd={() => {
          setDraggedEventId(null);
          setDragOverTargetKey(null);
        }}
        className={`group relative cursor-pointer rounded-md p-1.5 transition hover:brightness-110 ${solidCard ? theme.solid : theme.chip}`}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            openEditModal(event);
          }}
          className={`absolute right-1 top-1 rounded-md p-1 opacity-0 transition group-hover:opacity-100 ${solidCard ? 'bg-white/15 text-white hover:bg-white/25' : 'bg-black/10 text-white/90 hover:bg-black/20'}`}
          title="Editar evento"
        >
          <Pencil size={12} />
        </button>
        <div className="mb-0.5 flex items-center justify-between gap-2 pr-6">
          <span className={`text-[10px] font-bold uppercase ${solidCard ? 'text-white/85' : ''}`}>
            {event.tag || theme.label} • {timeFormatter.format(event.start)}
          </span>
        </div>
        <p className={`truncate text-xs font-bold ${solidCard ? 'text-white' : 'text-slate-100'}`}>
          {event.title}
        </p>
        <p className={`truncate text-[10px] ${solidCard ? 'text-white/80' : 'text-slate-300'}`}>
          {event.location}
        </p>
      </div>
    );
  };

  const openCreateModal = () => {
    const defaultDate = `${visibleMonth.getFullYear()}-${String(visibleMonth.getMonth() + 1).padStart(2, '0')}-01`;
    setEventForm({
      ...emptyEventForm,
      startDate: defaultDate,
      endDate: defaultDate,
    });
    setCreateError(null);
    setEditingEventId(null);
    setShowCreateModal(true);
  };

  const openEditModal = (event: CalendarEventViewModel) => {
    setEventForm({
      title: event.title,
      subtitle: event.subtitle || '',
      type: event.type,
      startDate: toDateInputValue(event.start),
      startTime: toTimeInputValue(event.start),
      endDate: toDateInputValue(event.end || event.start),
      endTime: toTimeInputValue(event.end),
      location: event.location,
      tag: event.tag || '',
      attendees: event.attendees.join(', '),
      description: event.description || '',
    });
    setCreateError(null);
    setEditingEventId(event.id);
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    if (savingEvent) return;
    setShowCreateModal(false);
    setCreateError(null);
    setEditingEventId(null);
  };

  const handleSubmitEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!eventForm.title || !eventForm.startDate || !eventForm.startTime || !eventForm.location) {
      setCreateError('Completa título, fecha/hora de inicio y ubicación.');
      return;
    }

    const startIso = new Date(`${eventForm.startDate}T${eventForm.startTime}:00`).toISOString();
    const endIso = eventForm.endDate && eventForm.endTime
      ? new Date(`${eventForm.endDate}T${eventForm.endTime}:00`).toISOString()
      : undefined;

    const dto: CreateCalendarEventDto = {
      title: eventForm.title,
      subtitle: eventForm.subtitle || undefined,
      type: eventForm.type,
      start: startIso,
      end: endIso,
      location: eventForm.location,
      tag: eventForm.tag || undefined,
      attendees: eventForm.attendees
        ? eventForm.attendees.split(',').map((item) => item.trim()).filter(Boolean)
        : [],
      description: eventForm.description || undefined,
      courseId: null,
    };

    try {
      setSavingEvent(true);
      if (editingEventId) {
        const updated = await dataService.updateEvento(editingEventId, { ...dto, id: editingEventId } as UpdateCalendarEventDto);
        const eventToPersist: CalendarEventViewModel = updated
          ? toViewModel(updated)
          : {
              id: editingEventId,
              title: dto.title,
              subtitle: dto.subtitle,
              type: dto.type,
              start: new Date(dto.start),
              end: dto.end ? new Date(dto.end) : undefined,
              location: dto.location,
              tag: dto.tag,
              attendees: dto.attendees || [],
              description: dto.description,
              courseId: dto.courseId,
            };

        setEvents((current) => current
          .map((event) => (event.id === editingEventId ? eventToPersist : event))
          .sort((a, b) => a.start.getTime() - b.start.getTime()));
        setUsingMockData(!updated);
      } else {
        const created = await dataService.createEvento(dto);
        const eventToInsert: CalendarEventViewModel = created
          ? toViewModel(created)
          : {
              id: `mock-${Date.now()}`,
              title: dto.title,
              subtitle: dto.subtitle,
              type: dto.type,
              start: new Date(dto.start),
              end: dto.end ? new Date(dto.end) : undefined,
              location: dto.location,
              tag: dto.tag,
              attendees: dto.attendees || [],
              description: dto.description,
              courseId: dto.courseId,
            };

        setEvents((current) => [...current, eventToInsert].sort((a, b) => a.start.getTime() - b.start.getTime()));
        setUsingMockData(!created);
      }

      setShowCreateModal(false);
    } catch (error: any) {
      setCreateError(error?.message || `No se pudo ${editingEventId ? 'actualizar' : 'crear'} el evento.`);
    } finally {
      setSavingEvent(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!editingEventId) return;
    if (!confirm('¿Eliminar este evento?')) return;

    try {
      setSavingEvent(true);
      const deleted = await dataService.deleteEvento(editingEventId);
      setEvents((current) => current.filter((event) => event.id !== editingEventId));
      setUsingMockData(!deleted);
      setShowCreateModal(false);
    } catch (error: any) {
      setCreateError(error?.message || 'No se pudo eliminar el evento.');
    } finally {
      setSavingEvent(false);
    }
  };

  return (
    <Layout>
      <div className="font-display text-slate-900 dark:text-white dark min-h-full rounded-2xl bg-[#101622] p-4 md:p-6 lg:p-8 shadow-2xl">
        <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black capitalize tracking-tight text-white md:text-4xl">
                  {viewMode === 'month' ? monthTitleFormatter.format(visibleMonth) : viewMode === 'week' ? weekRangeLabel : dayTitleFormatter.format(visibleMonth)}
                </h1>
                <div className="flex gap-1 rounded-lg bg-[#232f48] p-1">
                  <button
                    onClick={() => changeMonth(-1)}
                    className="flex size-8 items-center justify-center rounded-md text-[#92a4c9] transition hover:bg-[#111722] hover:text-white"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    onClick={() => changeMonth(1)}
                    className="flex size-8 items-center justify-center rounded-md text-[#92a4c9] transition hover:bg-[#111722] hover:text-white"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
              <p className="text-base text-[#92a4c9]">Gestiona ensayos, conciertos y actividades. La integración con backend puede conectarse luego sobre esta base.</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="hidden rounded-xl bg-[#232f48] p-1 sm:flex">
                <button onClick={() => setViewMode('month')} className={`rounded-lg px-4 py-1.5 text-sm transition ${viewMode === 'month' ? 'bg-blue-600 font-semibold text-white shadow-sm' : 'font-medium text-[#92a4c9] hover:text-white'}`}>Mes</button>
                <button onClick={() => setViewMode('week')} className={`rounded-lg px-4 py-1.5 text-sm transition ${viewMode === 'week' ? 'bg-blue-600 font-semibold text-white shadow-sm' : 'font-medium text-[#92a4c9] hover:text-white'}`}>Semana</button>
                <button onClick={() => setViewMode('day')} className={`rounded-lg px-4 py-1.5 text-sm transition ${viewMode === 'day' ? 'bg-blue-600 font-semibold text-white shadow-sm' : 'font-medium text-[#92a4c9] hover:text-white'}`}>Día</button>
              </div>
              <button onClick={openCreateModal} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-slate-900 shadow-lg shadow-white/10 transition hover:bg-slate-100">
                <Plus size={18} />
                Nuevo Evento
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#232f48] bg-[#151b28] px-4 py-3 text-sm text-[#92a4c9]">
            <div className="flex items-center gap-2">
              {loadingEvents ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} className="text-emerald-400" />}
              <span>
                {loadingEvents
                  ? 'Cargando eventos...'
                  : 'Mostrando eventos desde backend.'}
              </span>
            </div>
            <span className="text-xs uppercase tracking-wider text-[#6f7f9f]">Vista: {viewMode === 'month' ? `Mes ${monthKey}` : viewMode === 'week' ? `Semana ${weekRangeLabel}` : `Día ${dayFormatter.format(visibleMonth)}`}</span>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-1">
            {[
              { value: 'todos' as const, label: 'Todos', icon: <CalendarDays size={16} /> },
              { value: 'ensayo' as const, label: 'Ensayos', icon: <Music2 size={16} /> },
              { value: 'concierto' as const, label: 'Conciertos', icon: <Theater size={16} /> },
              { value: 'social' as const, label: 'Social', icon: <PartyPopper size={16} /> },
              { value: 'seccional' as const, label: 'Seccionales', icon: <Users size={16} /> },
            ].map((filter) => {
              const isActive = activeFilter === filter.value;
              const activeClass = filter.value === 'todos'
                ? 'bg-white/10 text-white'
                : getTypeTheme(filter.value as CalendarEventType).pill;

              return (
                <button
                  key={filter.value}
                  onClick={() => setActiveFilter(filter.value)}
                  className={`flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-bold transition ${isActive ? activeClass : 'bg-[#1a2332] text-[#92a4c9] hover:text-white'}`}
                >
                  {filter.icon}
                  {filter.label}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
            <div className="overflow-hidden rounded-2xl border border-[#232f48] bg-[#1a2332] shadow-xl lg:col-span-3">
              <div className={`grid border-b border-[#232f48] bg-[#1d2738] ${viewMode === 'day' ? 'grid-cols-1' : 'grid-cols-7'}`}>
                {weekDays.map((day, index) => {
                  if (viewMode === 'day' && index > 0) {
                    return null;
                  }
                  const cellDate = viewMode === 'month' ? null : weekCells[index];
                  const headerLabel = viewMode === 'day' ? 'Día' : day;
                  const isTodayHeader = cellDate ? sameDay(cellDate, new Date()) : false;
                  return (
                    <div key={day} className="py-3 text-center text-xs font-bold uppercase tracking-[0.22em] text-[#6f7f9f]">
                      <div>{headerLabel}</div>
                      {cellDate && (
                        <div className={`mt-1 text-sm tracking-normal ${isTodayHeader ? 'text-white' : 'text-slate-400'}`}>
                          {viewMode === 'day' ? dayTitleFormatter.format(visibleMonth) : cellDate.getDate()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {viewMode === 'month' ? (
                <div className="grid grid-cols-7 gap-px bg-[#232f48]">
                  {monthCells.map((day) => {
                    const dayEvents = visibleEvents.filter((event) => sameDay(event.start, day));
                    const isVisibleMonth = sameMonth(day, visibleMonth);
                    const isToday = sameDay(day, new Date());
                    const isDropTarget = dragOverTargetKey === toLocalDateKey(day);

                    return (
                      <div
                        key={day.toISOString()}
                        onDragOver={(event) => {
                          event.preventDefault();
                          setDragOverTargetKey(toLocalDateKey(day));
                        }}
                        onDragLeave={() => setDragOverTargetKey((current) => (current === toLocalDateKey(day) ? null : current))}
                        onDrop={(event) => {
                          event.preventDefault();
                          void handleDropOnDay(day);
                        }}
                        className={`min-h-[120px] bg-[#151b28] p-2 transition hover:bg-[#1a2130] ${!isVisibleMonth ? 'opacity-40' : ''} ${isDropTarget ? 'ring-2 ring-inset ring-blue-500' : ''}`}
                      >
                        <div className="mb-2 flex justify-end">
                          {isToday ? (
                            <div className="flex size-7 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white shadow-md shadow-blue-900/30">
                              {day.getDate()}
                            </div>
                          ) : (
                            <span className="text-sm font-medium text-slate-300">{day.getDate()}</span>
                          )}
                        </div>

                        <div className="flex flex-col gap-1.5">
                          {dayEvents.length > 0 ? (
                            <>
                              {dayEvents.slice(0, 2).map((event) => renderEventCard(event, event.tag === 'Tutti' || event.type === 'concierto'))}
                              {dayEvents.length > 2 && (
                                <span className="text-xs font-bold text-[#92a4c9]">+{dayEvents.length - 2} más</span>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-[#6f7f9f]">Sin eventos</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : viewMode === 'week' ? (
                <div className="grid grid-cols-7 gap-px bg-[#232f48]">
                  {weekCells.map((day) => {
                    const dayEvents = visibleEvents
                      .filter((event) => sameDay(event.start, day))
                      .sort((a, b) => a.start.getTime() - b.start.getTime());
                    const isToday = sameDay(day, new Date());
                    const isDropTarget = dragOverTargetKey === toLocalDateKey(day);

                    return (
                      <div
                        key={day.toISOString()}
                        onDragOver={(event) => {
                          event.preventDefault();
                          setDragOverTargetKey(toLocalDateKey(day));
                        }}
                        onDragLeave={() => setDragOverTargetKey((current) => (current === toLocalDateKey(day) ? null : current))}
                        onDrop={(event) => {
                          event.preventDefault();
                          void handleDropOnDay(day);
                        }}
                        className={`min-h-[520px] bg-[#151b28] p-3 ${isToday ? 'bg-[#192237]' : ''} ${isDropTarget ? 'ring-2 ring-inset ring-blue-500' : ''}`}
                      >
                        <div className="mb-3 flex items-center justify-between border-b border-white/5 pb-2">
                          <span className={`text-sm font-bold ${isToday ? 'text-white' : 'text-slate-300'}`}>{dayFormatter.format(day)}</span>
                          <span className="text-[10px] uppercase tracking-wider text-[#6f7f9f]">{dayEvents.length} eventos</span>
                        </div>
                        <div className="flex flex-col gap-2.5">
                          {dayEvents.length > 0 ? (
                            dayEvents.map((event) => renderEventCard(event, true))
                          ) : (
                            <div className="rounded-xl border border-dashed border-white/5 px-3 py-4 text-center text-xs text-[#6f7f9f]">
                              Sin eventos
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-[#151b28] p-4">
                  <div className="mb-4 flex items-center justify-between border-b border-white/5 pb-3">
                    <div>
                      <h3 className="text-xl font-bold capitalize text-white">{dayTitleFormatter.format(visibleMonth)}</h3>
                      <p className="mt-1 text-sm text-[#92a4c9]">Detalle horario del día seleccionado.</p>
                    </div>
                    <span className="rounded-full bg-[#232f48] px-3 py-1 text-xs font-bold text-[#92a4c9]">{selectedDayEvents.length} eventos</span>
                  </div>

                  <div className="grid grid-cols-[80px_1fr] gap-x-4">
                    <div className="space-y-3 pt-1">
                      {Array.from({ length: 15 }, (_, index) => 8 + index).map((hour) => (
                        <div key={hour} className="h-20 text-right text-xs font-bold uppercase tracking-wider text-[#6f7f9f]">
                          {String(hour).padStart(2, '0')}:00
                        </div>
                      ))}
                    </div>

                    <div className="space-y-3">
                      {Array.from({ length: 15 }, (_, index) => 8 + index).map((hour) => {
                        const hourEvents = selectedDayEvents.filter((event) => event.start.getHours() === hour);
                        const slotKey = toHourSlotKey(visibleMonth, hour);
                        const isDropTarget = dragOverTargetKey === slotKey;
                        return (
                          <div
                            key={hour}
                            onDragOver={(event) => {
                              event.preventDefault();
                              setDragOverTargetKey(slotKey);
                            }}
                            onDragLeave={() => setDragOverTargetKey((current) => (current === slotKey ? null : current))}
                            onDrop={(event) => {
                              event.preventDefault();
                              void handleDropOnHour(visibleMonth, hour);
                            }}
                            className={`min-h-20 rounded-xl border border-white/5 bg-[#1a2332] p-3 transition ${isDropTarget ? 'ring-2 ring-inset ring-blue-500 bg-[#202b40]' : ''}`}
                          >
                            {hourEvents.length > 0 ? (
                              <div className="space-y-2">
                                {hourEvents.map((event) => renderEventCard(event, true))}
                              </div>
                            ) : (
                              <div className="text-xs text-[#6f7f9f]">Sin eventos en esta franja</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-6">
              {highlightedEvent ? (
                <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-blue-500 p-6 text-white shadow-xl shadow-blue-950/30">
                  <div className="flex items-start justify-between">
                    <div className="rounded-lg bg-white/20 px-2.5 py-1 text-xs font-bold uppercase tracking-wider">Destacado</div>
                    <button onClick={() => openEditModal(highlightedEvent)} className="text-white/80 transition hover:text-white">
                      <MoreHorizontal size={18} />
                    </button>
                  </div>
                  <div className="mt-5">
                    <h3 className="text-2xl font-black leading-tight">{highlightedEvent.title}</h3>
                    <p className="mt-1 text-sm text-white/80">{highlightedEvent.subtitle}</p>
                    <div className="mt-5 space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Clock3 size={16} />
                        <span>{timeFormatter.format(highlightedEvent.start)}{highlightedEvent.end ? ` - ${timeFormatter.format(highlightedEvent.end)}` : ''}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin size={16} />
                        <span>{highlightedEvent.location}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 border-t border-white/20 pt-4">
                    <div className="flex -space-x-2">
                      {highlightedEvent.attendees.slice(0, 4).map((attendee) => (
                        <div key={attendee} className="flex size-8 items-center justify-center rounded-full border-2 border-blue-500 bg-white text-xs font-bold text-blue-600">
                          {attendee}
                        </div>
                      ))}
                      {highlightedEvent.attendees.length > 4 && (
                        <div className="flex size-8 items-center justify-center rounded-full border-2 border-blue-500 bg-white text-xs font-bold text-blue-600">
                          +{highlightedEvent.attendees.length - 4}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-[#2b6cee]/40 bg-[#1a2332] p-6 text-[#92a4c9]">
                  No hay eventos para el filtro seleccionado.
                </div>
              )}

              <div className="flex flex-col gap-4">
                <h3 className="flex items-center gap-2 text-lg font-bold text-white">
                  Próximos Eventos
                  <span className="rounded-full bg-[#232f48] px-2 py-0.5 text-xs text-[#92a4c9]">{upcomingEvents.length}</span>
                </h3>
                <div className="flex flex-col gap-3">
                  {upcomingEvents.map((event) => {
                    const theme = getTypeTheme(event.type);
                    return (
                      <div key={event.id} onClick={() => openEditModal(event)} className="group cursor-pointer rounded-2xl border border-[#232f48] bg-[#1a2332] p-4 transition hover:border-[#2b6cee]/40 hover:bg-[#212c40]">
                        <div className="flex items-start gap-3">
                          <div className={`rounded-xl px-2 py-1 text-center ${theme.pill}`}>
                            <div className="text-[10px] font-black uppercase">{weekdayFormatter.format(event.start)}</div>
                            <div className="text-lg font-black">{event.start.getDate()}</div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="truncate text-sm font-bold text-white">{event.title}</h4>
                              <Pencil size={13} className="mt-0.5 shrink-0 text-[#92a4c9] opacity-0 transition group-hover:opacity-100" />
                            </div>
                            <p className="mt-0.5 text-xs text-[#92a4c9]">
                              {timeFormatter.format(event.start)} • {event.location}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-[#232f48] bg-[#1a2332] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">Vista rápida</h3>
                  <span className="text-xs text-[#92a4c9]">Backend-ready</span>
                </div>
                <div className="rounded-xl bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-4">
                  <div className="mb-4 flex items-center gap-2 text-sm text-[#92a4c9]">
                    <MapPin size={15} />
                    Próxima ubicación destacada
                  </div>
                  <div className="h-28 rounded-xl bg-[radial-gradient(circle_at_20%_30%,rgba(43,108,238,0.28),transparent_18%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02)),repeating-linear-gradient(90deg,transparent,transparent_22px,rgba(255,255,255,0.04)_22px,rgba(255,255,255,0.04)_23px),repeating-linear-gradient(0deg,transparent,transparent_22px,rgba(255,255,255,0.04)_22px,rgba(255,255,255,0.04)_23px)]" />
                  <p className="mt-3 text-xs text-[#92a4c9]">Placeholder visual para integrar luego con ubicaciones o detalle de sede desde backend.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#232f48] bg-[#151b28] p-4 text-sm text-[#92a4c9]">
            El calendario ya intenta consumir `dataService.getEventos(...)`. Si backend no devuelve eventos, hace fallback automático a los mock locales sin romper la pantalla.
          </div>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-[#232f48] bg-[#111722] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#232f48] px-6 py-4">
              <div>
                <h3 className="text-xl font-bold text-white">{editingEventId ? 'Editar Evento' : 'Nuevo Evento'}</h3>
                <p className="text-sm text-[#92a4c9]">Usa los DTOs de eventos ya definidos. Si no hay backend, se persiste localmente como mock.</p>
              </div>
              <button onClick={closeCreateModal} className="text-[#92a4c9] transition hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitEvent} className="space-y-4 px-6 py-5">
              {createError && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {createError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <input
                  value={eventForm.title}
                  onChange={(e) => setEventForm((current) => ({ ...current, title: e.target.value }))}
                  placeholder="Título"
                  className="rounded-xl border border-[#232f48] bg-[#151b28] px-4 py-3 text-white outline-none transition focus:border-blue-500"
                />
                <input
                  value={eventForm.subtitle}
                  onChange={(e) => setEventForm((current) => ({ ...current, subtitle: e.target.value }))}
                  placeholder="Subtítulo"
                  className="rounded-xl border border-[#232f48] bg-[#151b28] px-4 py-3 text-white outline-none transition focus:border-blue-500"
                />
                <select
                  value={eventForm.type}
                  onChange={(e) => setEventForm((current) => ({ ...current, type: e.target.value as CalendarEventType }))}
                  className="rounded-xl border border-[#232f48] bg-[#151b28] px-4 py-3 text-white outline-none transition focus:border-blue-500"
                >
                  <option value="ensayo">Ensayo</option>
                  <option value="concierto">Concierto</option>
                  <option value="social">Social</option>
                  <option value="seccional">Seccional</option>
                </select>
                <input
                  value={eventForm.location}
                  onChange={(e) => setEventForm((current) => ({ ...current, location: e.target.value }))}
                  placeholder="Ubicación"
                  className="rounded-xl border border-[#232f48] bg-[#151b28] px-4 py-3 text-white outline-none transition focus:border-blue-500"
                />
                <input
                  type="date"
                  value={eventForm.startDate}
                  onChange={(e) => setEventForm((current) => ({ ...current, startDate: e.target.value }))}
                  className="rounded-xl border border-[#232f48] bg-[#151b28] px-4 py-3 text-white outline-none transition focus:border-blue-500"
                />
                <input
                  type="time"
                  value={eventForm.startTime}
                  onChange={(e) => setEventForm((current) => ({ ...current, startTime: e.target.value }))}
                  className="rounded-xl border border-[#232f48] bg-[#151b28] px-4 py-3 text-white outline-none transition focus:border-blue-500"
                />
                <input
                  type="date"
                  value={eventForm.endDate}
                  onChange={(e) => setEventForm((current) => ({ ...current, endDate: e.target.value }))}
                  className="rounded-xl border border-[#232f48] bg-[#151b28] px-4 py-3 text-white outline-none transition focus:border-blue-500"
                />
                <input
                  type="time"
                  value={eventForm.endTime}
                  onChange={(e) => setEventForm((current) => ({ ...current, endTime: e.target.value }))}
                  className="rounded-xl border border-[#232f48] bg-[#151b28] px-4 py-3 text-white outline-none transition focus:border-blue-500"
                />
                <input
                  value={eventForm.tag}
                  onChange={(e) => setEventForm((current) => ({ ...current, tag: e.target.value }))}
                  placeholder="Tag opcional (ej: Tutti)"
                  className="rounded-xl border border-[#232f48] bg-[#151b28] px-4 py-3 text-white outline-none transition focus:border-blue-500 md:col-span-2"
                />
                <input
                  value={eventForm.attendees}
                  onChange={(e) => setEventForm((current) => ({ ...current, attendees: e.target.value }))}
                  placeholder="Asistentes separados por coma (ej: LP, TM, CR)"
                  className="rounded-xl border border-[#232f48] bg-[#151b28] px-4 py-3 text-white outline-none transition focus:border-blue-500 md:col-span-2"
                />
                <textarea
                  value={eventForm.description}
                  onChange={(e) => setEventForm((current) => ({ ...current, description: e.target.value }))}
                  placeholder="Descripción"
                  rows={4}
                  className="rounded-xl border border-[#232f48] bg-[#151b28] px-4 py-3 text-white outline-none transition focus:border-blue-500 md:col-span-2"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-[#232f48] pt-4">
                {editingEventId && (
                  <button type="button" onClick={handleDeleteEvent} disabled={savingEvent} className="mr-auto flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 font-bold text-red-300 transition hover:bg-red-500/20 disabled:opacity-60">
                    <Trash2 size={16} /> Eliminar
                  </button>
                )}
                <button type="button" onClick={closeCreateModal} className="rounded-xl px-4 py-2 text-[#92a4c9] transition hover:bg-white/5 hover:text-white">
                  Cancelar
                </button>
                <button type="submit" disabled={savingEvent} className="rounded-xl bg-blue-600 px-5 py-2 font-bold text-white transition hover:bg-blue-700 disabled:opacity-60">
                  {savingEvent ? 'Guardando...' : editingEventId ? 'Guardar Cambios' : 'Crear Evento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default EventCalendar;