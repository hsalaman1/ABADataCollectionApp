# Graphing & Data Visualization Tools Research
## ABA Data Collection App

### Current State

The app currently uses **Recharts 3.6.0** for data visualization in the DataPage component, rendering line charts to display behavior trends over sessions.

---

## Recommended React Charting Libraries

### 1. Recharts (Current - Recommended to Keep) ⭐

**Website:** https://recharts.org

| Aspect | Details |
|--------|---------|
| **Type** | SVG-based, React components |
| **Bundle Size** | ~150KB |
| **TypeScript** | Full support |
| **Learning Curve** | Easy |
| **Best For** | Simple to moderate charts, React-native feel |

**Pros:**
- Already integrated in your app
- Declarative, component-based API matches React patterns
- Excellent for time-series data (behavior trends over sessions)
- Good documentation and community support
- Works well with React's state management and memoization
- Responsive containers built-in

**Cons:**
- Can struggle with very large datasets (1000+ points)
- Limited to SVG rendering

**Verdict:** Keep using Recharts for most visualization needs. It's well-suited for ABA data patterns.

---

### 2. Victory Charts (Accessibility Focus) ⭐⭐

**Website:** https://commerce.nearform.com/open-source/victory/

| Aspect | Details |
|--------|---------|
| **Type** | SVG-based, React components |
| **Bundle Size** | ~200KB |
| **TypeScript** | Full support |
| **Learning Curve** | Easy-Moderate |
| **Best For** | Accessible charts, cross-platform (React Native) |

**Pros:**
- Built-in ARIA attributes and keyboard navigation
- Screen reader friendly (important for healthcare compliance)
- Same API works for React Native if you expand to mobile
- Modular - import only what you need
- Great animation support
- Consistent theming system

**Cons:**
- Slightly larger bundle than Recharts
- Less community traction than Recharts

**Recommendation:** Consider Victory if accessibility compliance becomes a requirement or if you plan to build a React Native version.

---

### 3. Nivo (Rich Visualization Options)

**Website:** https://nivo.rocks

| Aspect | Details |
|--------|---------|
| **Type** | SVG, Canvas, and HTML rendering |
| **Bundle Size** | ~300KB+ (modular imports available) |
| **TypeScript** | Full support |
| **Learning Curve** | Moderate |
| **Best For** | Complex dashboards, beautiful out-of-box styling |

**Pros:**
- Widest variety of chart types (heatmaps, calendar, chord diagrams, etc.)
- Canvas mode for large datasets
- Built-in theming and motion
- Server-side rendering support
- Interactive playground for testing

**Potential Use Cases for ABA App:**
- **Heatmaps** for interval recording patterns (which intervals have most occurrences)
- **Calendar charts** for session frequency visualization
- **Radar charts** for multi-behavior comparison

**Cons:**
- Larger bundle size
- More complex API

---

### 4. Apache ECharts (echarts-for-react) (Performance Champion)

**Website:** https://echarts.apache.org

| Aspect | Details |
|--------|---------|
| **Type** | Canvas/WebGL |
| **Bundle Size** | ~400KB (tree-shakeable) |
| **TypeScript** | Full support |
| **Learning Curve** | Moderate-Steep |
| **Best For** | Large datasets, complex interactions |

**Pros:**
- GPU-accelerated rendering
- Handles millions of data points
- Rich interaction options (brushing, drill-down, zoom)
- Excellent for historical data analysis
- Cross-platform (same config works in other frameworks)

**Potential Use Cases for ABA App:**
- Long-term trend analysis across many sessions
- Drill-down from monthly → weekly → daily → session level
- Combined chart types (line + bar for frequency vs duration)

**Cons:**
- Configuration-based API (less React-like)
- Steeper learning curve
- Larger bundle size

---

### 5. Visx (by Airbnb) (Maximum Flexibility)

**Website:** https://airbnb.io/visx

| Aspect | Details |
|--------|---------|
| **Type** | Low-level SVG primitives |
| **Bundle Size** | Very small (modular) |
| **TypeScript** | Full support |
| **Learning Curve** | Steep |
| **Best For** | Custom, unique visualizations |

**Pros:**
- Maximum customization control
- Tiny bundle (import only needed primitives)
- D3.js power with React patterns
- Create completely custom chart types

**Cons:**
- Requires more code to build charts
- No pre-built chart components
- Higher development time

**Recommendation:** Use only if you need highly specialized visualizations that other libraries can't provide.

---

### 6. REAVIZ (Enterprise Healthcare Focus)

**Website:** https://reaviz.dev

| Aspect | Details |
|--------|---------|
| **Type** | SVG-based |
| **Bundle Size** | Moderate |
| **TypeScript** | Full support |
| **Learning Curve** | Easy-Moderate |
| **Best For** | Enterprise/healthcare applications |

**Pros:**
- Built with accessibility in mind
- Screen reader support
- Production-tested in enterprise products
- 22+ pre-built visualization components
- Great default styling

**Cons:**
- Smaller community than Recharts/Victory
- Less documentation

---

### 7. React-Chartjs-2 (Chart.js Wrapper)

**Website:** https://react-chartjs-2.js.org

| Aspect | Details |
|--------|---------|
| **Type** | Canvas-based |
| **Bundle Size** | ~150KB |
| **TypeScript** | Full support |
| **Learning Curve** | Easy |
| **Best For** | Quick prototyping, simple dashboards |

**Pros:**
- Canvas rendering = good performance
- Simple API
- Animated transitions
- Good for prototyping

**Cons:**
- Canvas makes customization harder than SVG
- Less React-like API

---

## Comparison Matrix

| Library | Performance | Ease of Use | Customization | Accessibility | TypeScript | Best Use Case |
|---------|-------------|-------------|---------------|---------------|------------|---------------|
| **Recharts** | Good | ⭐⭐⭐⭐⭐ | Good | Basic | ✅ | General purpose |
| **Victory** | Good | ⭐⭐⭐⭐ | Good | ⭐⭐⭐⭐⭐ | ✅ | Accessible apps |
| **Nivo** | Great | ⭐⭐⭐ | Excellent | Good | ✅ | Rich dashboards |
| **ECharts** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | Excellent | Good | ✅ | Big data |
| **Visx** | Excellent | ⭐⭐ | ⭐⭐⭐⭐⭐ | Custom | ✅ | Custom charts |
| **REAVIZ** | Good | ⭐⭐⭐⭐ | Good | ⭐⭐⭐⭐⭐ | ✅ | Healthcare apps |
| **Chart.js** | Great | ⭐⭐⭐⭐⭐ | Moderate | Basic | ✅ | Quick setup |

---

## Recommendations for ABA Data Collection App

### Immediate (Keep Current)
**Recharts** is a solid choice for your current needs:
- Line charts for behavior trends ✓
- Easy to maintain ✓
- Good TypeScript support ✓
- Works well with your data types ✓

### Suggested Enhancements with Recharts

```tsx
// Current chart types to consider adding:

// 1. Bar Chart - Session comparisons
<BarChart data={sessionData}>
  <Bar dataKey="frequency" fill="#8884d8" />
</BarChart>

// 2. Area Chart - Cumulative progress
<AreaChart data={cumulativeData}>
  <Area type="monotone" dataKey="totalTrials" />
</AreaChart>

// 3. Composed Chart - Multiple metrics
<ComposedChart data={data}>
  <Bar dataKey="frequency" />
  <Line dataKey="duration" />
</ComposedChart>

// 4. Pie Chart - Behavior distribution
<PieChart>
  <Pie data={behaviorBreakdown} dataKey="value" />
</PieChart>
```

### Future Considerations

1. **If accessibility becomes critical** → Add Victory for accessible charts
2. **If you need heatmaps for interval patterns** → Add Nivo's heatmap component
3. **If data grows significantly (100+ sessions)** → Consider ECharts for performance
4. **If building React Native app** → Victory works on both platforms

---

## Specific Chart Type Recommendations for ABA Data

| Data Type | Current | Recommended Charts |
|-----------|---------|-------------------|
| **Frequency** | Line | Line, Bar, Area (cumulative) |
| **Duration** | Line | Line, Area, Stacked Bar |
| **Interval** | Line (%) | Heatmap, Stacked Bar, Line |
| **Event/Trial** | Line (%) | Line, Scatter, Progress bars |
| **Deceleration** | Line | Composed (Bar + Line), Area |
| **ABC Data** | None | Pie/Donut (distribution), Sankey (flow) |

---

## Implementation Priority

1. ✅ Line charts (done)
2. 📋 Bar charts for session-to-session comparison
3. 📋 Composed charts showing frequency + duration together
4. 📋 Goal/threshold reference lines
5. 📋 Date range filtering for trend analysis
6. 📋 Heatmaps for interval recording patterns (requires Nivo)
7. 📋 ABC data distribution pie charts

---

## Resources

- [Recharts Documentation](https://recharts.org/en-US/api)
- [Victory Documentation](https://commerce.nearform.com/open-source/victory/docs)
- [Nivo Documentation](https://nivo.rocks/components)
- [LogRocket: Best React Chart Libraries 2025](https://blog.logrocket.com/best-react-chart-libraries-2025/)
- [npm-compare: Recharts vs Victory vs Nivo](https://npm-compare.com/@nivo/bar,recharts,victory)

---

*Research compiled: January 2026*
*Current app stack: React 19.2 + TypeScript 5.9 + Vite 7.2*
