import type { DashboardColor, DashboardSeriesPoint } from '$lib/types/dashboard';

export type DashboardChartValueFormat = 'number' | 'currency' | 'score';

export interface DashboardChartProps {
	data: DashboardSeriesPoint[];
	color?: DashboardColor;
	height?: number;
	valueFormat?: DashboardChartValueFormat;
	xLabelMaxLength?: number;
	emptyMessage?: string;
	'aria-label'?: string;
	class?: string;
}
