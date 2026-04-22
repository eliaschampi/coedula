import type { DashboardColor, DashboardSeriesPoint } from '$lib/types/dashboard';

export type DashboardChartValueFormat = 'number' | 'currency';

export interface DashboardChartProps {
	data: DashboardSeriesPoint[];
	color?: DashboardColor;
	height?: number;
	valueFormat?: DashboardChartValueFormat;
	emptyMessage?: string;
	'aria-label'?: string;
	class?: string;
}
