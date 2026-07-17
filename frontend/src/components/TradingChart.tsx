"use client";
import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickSeries, LineSeries } from 'lightweight-charts';

interface TradingChartProps {
  data: any[];
  colors?: {
    backgroundColor?: string;
    lineColor?: string;
    textColor?: string;
    areaTopColor?: string;
    areaBottomColor?: string;
  };
}

export const TradingChart: React.FC<TradingChartProps> = ({
  data,
  colors = {
    backgroundColor: 'transparent',
    lineColor: '#2962FF',
    textColor: '#d1d5db',
    areaTopColor: '#2962FF',
    areaBottomColor: 'rgba(41, 98, 255, 0.28)',
  },
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: colors.backgroundColor },
        textColor: colors.textColor,
      },
      grid: {
        vertLines: { color: '#334155' },
        horzLines: { color: '#334155' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
    });
    
    chartRef.current = chart;

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });
    
    seriesRef.current = candlestickSeries;

    if (data && data.length > 0) {
      // Filter out invalid OHLC data and duplicates to prevent lightweight-charts crashes
      const uniqueData: any[] = [];
      const seenTimes = new Set();
      for (const d of data) {
        if (d.time && !seenTimes.has(d.time)) {
          if (d.open !== null && d.high !== null && d.low !== null && d.close !== null) {
            seenTimes.add(d.time);
            uniqueData.push(d);
          }
        }
      }

      // Sort data chronologically as required by lightweight-charts
      uniqueData.sort((a, b) => {
        const timeA = typeof a.time === 'string' ? new Date(a.time).getTime() : a.time;
        const timeB = typeof b.time === 'string' ? new Date(b.time).getTime() : b.time;
        return timeA - timeB;
      });

      if (uniqueData.length > 0) {
        candlestickSeries.setData(uniqueData);

        const mapData = (key: string) => uniqueData
          .filter(d => d[key] !== undefined && d[key] !== null)
          .map(d => ({ time: d.time, value: d[key] }));

        const addLine = (key: string, color: string, lineStyle: number = 0) => {
          const series = chart.addSeries(LineSeries, { color, lineWidth: 1, lineStyle, crosshairMarkerVisible: false });
          const lineData = mapData(key);
          if (lineData.length > 0) {
            series.setData(lineData);
          }
          return series;
        };

        addLine('EMA20', '#3b82f6'); // blue-500
        addLine('EMA50', '#eab308'); // yellow-500
        addLine('EMA100', '#f97316'); // orange-500
        addLine('EMA200', '#ef4444'); // red-500
        addLine('VWAP', '#a855f7', 2); // purple-500, dashed
        addLine('BB_upper', '#64748b', 1); // slate-500, dotted
        addLine('BB_lower', '#64748b', 1); // slate-500, dotted
      }
    }

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, colors]);

  return (
    <div
      ref={chartContainerRef}
      className="w-full h-[400px]"
    />
  );
};
