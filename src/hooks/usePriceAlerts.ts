import { create } from 'zustand';
import { STROOPS_PER_XLM } from '@/constants/stellar';
import { priceAlertStorage } from '@/lib/priceAlertStorage';
import type {
	PriceAlert,
	CreatePriceAlertPayload,
} from '@/types/priceAlert.types';
import type { PriceAlert as ServicePriceAlert } from '@/services/alert.service';

interface PriceAlertsState {
	alerts: PriceAlert[];
	addAlert: (payload: CreatePriceAlertPayload) => void;
	removeAlert: (id: string) => void;
	updateAlert: (id: string, patch: Partial<PriceAlert>) => void;
}

const toStroops = (priceXlm: number): number =>
	Math.round(priceXlm * STROOPS_PER_XLM);
const toXlm = (priceStroops: number): number => priceStroops / STROOPS_PER_XLM;

export const usePriceAlerts = create<PriceAlertsState>(() => ({
	alerts: priceAlertStorage.getAll(),

	addAlert(payload: CreatePriceAlertPayload): void {
		const newAlert = priceAlertStorage.add(payload);
		usePriceAlerts.setState(state => ({
			alerts: [...state.alerts, newAlert],
		}));
	},

	removeAlert(id: string): void {
		priceAlertStorage.remove(id);
		usePriceAlerts.setState(state => ({
			alerts: state.alerts.filter(a => a.id !== id),
		}));
	},

	updateAlert(id: string, patch: Partial<PriceAlert>): void {
		priceAlertStorage.update(id, patch);
		usePriceAlerts.setState(state => ({
			alerts: state.alerts.map(a => (a.id === id ? { ...a, ...patch } : a)),
		}));
	},
}));

interface CreateAlertVars {
	keyId: string;
	keyName: string;
	/** Target price in XLM, as entered in the UI. */
	targetPrice: number;
	direction: 'above' | 'below';
}

interface UpdateAlertVars {
	/** Alert ID — matches the `alertId` field used by existing components. */
	alertId: string;
	targetPrice?: number;
	direction?: 'above' | 'below';
}

function buildAlertPayload(vars: CreateAlertVars): CreatePriceAlertPayload {
	return {
		creatorId: vars.keyId,
		creatorTitle: vars.keyName,
		thresholdStroops: toStroops(vars.targetPrice),
		direction: vars.direction,
	};
}

function buildAlertPatch(vars: UpdateAlertVars): Partial<PriceAlert> {
	const patch: Partial<PriceAlert> = {};
	if (vars.targetPrice !== undefined) {
		patch.thresholdStroops = toStroops(vars.targetPrice);
	}
	if (vars.direction !== undefined) patch.direction = vars.direction;
	return patch;
}

/** Returns all alerts for the current user from local storage. */
export function useActivePriceAlerts(_userId?: string) {
	const alerts = usePriceAlerts(state => state.alerts);
	const data: ServicePriceAlert[] = alerts.map(a => ({
		id: a.id,
		keyId: a.creatorId,
		keyName: a.creatorTitle,
		keyTitle: a.creatorTitle,
		targetPrice: toXlm(a.thresholdStroops),
		direction: a.direction,
		triggered: a.lastTriggeredAt !== null,
		createdAt: a.createdAt,
	}));
	return {
		data,
		isLoading: false,
		isError: false,
		refetch: () => Promise.resolve(),
	};
}

/** Returns a mutation-compatible object for creating a new alert. */
export function useCreatePriceAlert(_userId?: string) {
	const addAlert = usePriceAlerts(state => state.addAlert);
	return {
		mutate(vars: CreateAlertVars) {
			addAlert(buildAlertPayload(vars));
		},
		mutateAsync(vars: CreateAlertVars) {
			addAlert(buildAlertPayload(vars));
			return Promise.resolve();
		},
		isPending: false,
		isError: false,
		error: null as Error | null,
		reset() {},
	};
}

/** Returns a mutation-compatible object for updating an existing alert. */
export function useUpdatePriceAlert(_userId?: string) {
	const updateAlert = usePriceAlerts(state => state.updateAlert);
	return {
		mutate(vars: UpdateAlertVars) {
			updateAlert(vars.alertId, buildAlertPatch(vars));
		},
		mutateAsync(vars: UpdateAlertVars) {
			updateAlert(vars.alertId, buildAlertPatch(vars));
			return Promise.resolve();
		},
		isPending: false,
		isError: false,
		error: null as Error | null,
		reset() {},
	};
}

/** Returns a mutation-compatible object for deleting an alert. */
export function useDeletePriceAlert(_userId?: string) {
	const removeAlert = usePriceAlerts(state => state.removeAlert);
	return {
		mutate(alertId: string) {
			removeAlert(alertId);
		},
		mutateAsync(alertId: string) {
			removeAlert(alertId);
			return Promise.resolve();
		},
		isPending: false,
		isError: false,
		error: null as Error | null,
		reset() {},
	};
}
