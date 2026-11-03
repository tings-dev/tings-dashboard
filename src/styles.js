export const CARD_STYLES = `
:host{display:block;box-sizing:border-box;width:100%;height:var(--tings-dashboard-height,100dvh);font-family:Arial,Helvetica,sans-serif}
*{box-sizing:border-box}[hidden]{display:none!important}
.screen{height:100%;width:100%;overflow:hidden;position:relative;background:var(--background);color:var(--text);display:grid;grid-template-columns:minmax(0,1fr) var(--rail-width)}
.screen.no-rail{grid-template-columns:minmax(0,1fr)}
.workspace{min-height:0;min-width:0;position:relative;display:grid;grid-template-columns:minmax(0,var(--left-width)) minmax(0,1fr);gap:var(--gap);padding:var(--pad);padding-bottom:calc(var(--pad) + var(--caption-space,0px))}
.workspace.single{grid-template-columns:minmax(0,1fr)}
.home{min-width:0;min-height:0;display:grid;grid-template-rows:auto minmax(0,1fr) auto}
.room{--component-scale:var(--room-scale);font-size:calc(var(--label-font) * var(--component-scale,1));color:var(--muted);text-transform:uppercase;letter-spacing:.12em;min-height:22px;display:flex;align-items:center;gap:calc(10px * var(--room-scale));overflow-wrap:anywhere;line-height:1.3}
.room:before{content:'';width:calc(6px * var(--room-scale));height:calc(6px * var(--room-scale));border-radius:50%;background:currentColor;flex:none}
.timeblock{min-height:0;min-width:0;display:flex;flex-direction:column;justify-content:center;padding-block:12px}
.clock{--component-scale:var(--clock-scale);display:flex;align-items:baseline;gap:.06em;font-size:calc(var(--clock-font) * var(--component-scale,1));line-height:1.08;white-space:nowrap;font-weight:400;letter-spacing:-.065em;font-variant-numeric:tabular-nums;direction:ltr;unicode-bidi:isolate;max-width:100%}
.period{font-size:.16em;letter-spacing:0;color:var(--muted)}
.date{--component-scale:var(--date-scale);font-size:calc(var(--date-font) * var(--component-scale,1));line-height:1.3;color:var(--muted);margin-top:calc(16px * var(--date-scale));overflow-wrap:anywhere}
.footer{display:grid;gap:14px;min-width:0}
.readings{--component-scale:var(--readings-scale);display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:calc(18px * var(--readings-scale)) calc(24px * var(--readings-scale));width:calc(var(--readings-width) * var(--readings-scale));max-width:100%}
.reading{min-width:0;min-height:48px;overflow-wrap:anywhere;border:0;padding:0;background:transparent;color:inherit;font:inherit;text-align:start;border-radius:3px;cursor:pointer}.reading:disabled{opacity:1;cursor:default}
.reading strong{font-size:calc(var(--reading-font) * var(--component-scale,1));font-weight:400;line-height:1.2;letter-spacing:-.025em;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.reading small{font-size:.44em;color:var(--muted);letter-spacing:0;margin-inline-start:calc(3px * var(--readings-scale))}
.reading span{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;font-size:calc(var(--label-font) * var(--component-scale,1));color:var(--muted);margin-top:calc(6px * var(--readings-scale));line-height:1.3}
.weather,.co2-caption{display:flex;align-items:center;gap:8px;color:var(--muted);font-size:calc(var(--label-font) * var(--component-scale,1));line-height:1.4;overflow-wrap:anywhere;min-width:0}
.weather{--component-scale:var(--weather-scale);gap:calc(8px * var(--weather-scale))}
.weather-copy{min-width:0}.weather-copy>span{display:block}.forecast{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:.92em}.weather svg{width:calc(22px * var(--weather-scale));height:calc(22px * var(--weather-scale));stroke:currentColor;fill:none;stroke-width:1.6;flex:none}
.co2-copy{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.co2-caption{gap:calc(8px * var(--co2-caption-scale))}
.co2-copy{font-size:calc(var(--label-font) * var(--co2-caption-scale))}
.co2-caption-value{font-size:calc(var(--label-font) * var(--co2-value-scale))}
.co2-caption-status{font-size:calc(var(--label-font) * var(--co2-status-scale))}
.dot{background:var(--air-color,var(--muted));width:calc(7px * var(--co2-caption-scale));height:calc(7px * var(--co2-caption-scale));border-radius:50%;flex:none}
.rail-caption{position:absolute;bottom:14px;right:var(--pad);max-width:calc(100% - 2 * var(--pad));display:flex;flex-direction:column;align-items:flex-end;gap:4px}
.rail-caption .co2-caption{max-width:100%}
.calendar{--component-scale:var(--calendar-scale);min-width:0;min-height:0;border-inline-start:1px solid var(--divider);padding-inline-start:var(--gap);padding-top:calc(var(--calendar-top) * var(--calendar-scale));padding-bottom:var(--co2-value-space,0px);overflow:hidden}
.calendar-heading{display:flex;justify-content:space-between;align-items:center;gap:calc(12px * var(--calendar-scale));color:var(--muted);font-size:calc(var(--label-font) * var(--component-scale,1));line-height:1.3;letter-spacing:.1em;text-transform:uppercase;margin-bottom:calc(20px * var(--calendar-scale))}
.calendar-heading small{font-size:.8em;letter-spacing:0;text-transform:none}
.all-day{font-size:calc(var(--label-font) * var(--component-scale,1));color:var(--muted);line-height:1.4;border-bottom:1px solid var(--divider);padding-bottom:calc(12px * var(--calendar-scale));margin-bottom:calc(4px * var(--calendar-scale));overflow-wrap:anywhere}
.all-day-heading{display:block;font-size:.8em;text-transform:uppercase;letter-spacing:.08em;margin-bottom:calc(6px * var(--calendar-scale))}
.event{padding:calc(var(--event-padding) * var(--calendar-scale)) 0;border-bottom:1px solid var(--divider)}
.when{font-size:calc(var(--when-font) * var(--component-scale,1));color:var(--muted);margin-bottom:calc(9px * var(--calendar-scale));line-height:1.3;overflow-wrap:anywhere}
h2{font-size:calc(var(--event-font) * var(--component-scale,1));font-weight:400;letter-spacing:-.025em;line-height:1.2;margin:0;overflow-wrap:anywhere;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}
.source{display:flex;align-items:center;gap:calc(6px * var(--calendar-scale));white-space:nowrap;overflow:hidden;font-size:calc(var(--source-font) * var(--component-scale,1));color:var(--muted);margin-top:calc(9px * var(--calendar-scale));line-height:1.3;overflow-wrap:anywhere}
.more,.notice{color:var(--muted);font-size:calc(var(--label-font) * var(--component-scale,1));line-height:1.4;margin-top:calc(14px * var(--calendar-scale));overflow-wrap:anywhere}
.focus{padding-top:calc(var(--focus-top) * var(--calendar-scale))}
.badge{font-size:calc(var(--label-font) * var(--component-scale,1));color:var(--accent);text-transform:uppercase;letter-spacing:.1em;line-height:1.3;margin-bottom:calc(18px * var(--calendar-scale))}
.focus h2{font-size:calc(var(--focus-font) * var(--component-scale,1))}
.timing{font-size:calc(var(--when-font) * var(--component-scale,1));color:var(--muted);margin-top:calc(18px * var(--calendar-scale));line-height:1.5}
.next-event{margin-top:calc(24px * var(--calendar-scale));border-top:1px solid var(--divider);padding-top:calc(16px * var(--calendar-scale));font-size:calc(var(--when-font) * var(--component-scale,1));line-height:1.4;color:var(--muted)}
.next-event small{font-size:.8em;display:block;margin-bottom:calc(8px * var(--calendar-scale))}
.air{position:relative;background:var(--rail);border-inline-start:1px solid var(--divider);min-width:0;overflow:hidden}
.air-fill{position:absolute;bottom:0;left:0;right:0;height:var(--air-fill,0%);background:var(--air-color,var(--muted))}
.air-top{--component-scale:var(--co2-bar-scale);position:absolute;top:var(--pad);left:3px;right:3px;text-align:center;font-size:calc(var(--source-font) * var(--component-scale,1));letter-spacing:.08em;color:var(--text);padding:3px 0}
.air-value{--component-scale:var(--co2-value-scale);width:var(--co2-value-width);max-width:100%;text-align:right;font-size:calc(var(--when-font) * var(--component-scale,1));color:var(--text);padding:4px 0 4px 16px;white-space:nowrap;line-height:1.2}
.mark{position:absolute;right:0;width:calc(8px * var(--co2-marks-scale));border-top:calc(1px * var(--co2-marks-scale)) solid var(--text);opacity:.3}
.solo .room{justify-content:center}.solo .timeblock{text-align:center}.solo .clock{font-size:calc(var(--solo-clock-font) * var(--component-scale,1));justify-content:center}.solo .footer{justify-items:center}
.readings-only .home{grid-template-rows:auto minmax(0,1fr)}.readings-only .timeblock{display:none}.readings-only .footer{align-self:center;justify-items:center}
.no-clock.has-calendar .workspace:not(.single){grid-template-columns:minmax(0,32%) minmax(0,1fr)}
.no-clock .footer{align-self:center}.no-clock .timeblock{justify-content:flex-start}
.calendar-only .calendar{border:0;padding-inline-start:0}.calendar-only .focus h2{font-size:calc(var(--focus-font) * var(--calendar-scale) * 1.25)}
.source-chip{display:inline-flex;align-items:center;gap:calc(4px * var(--calendar-scale));min-width:0}.source-chip>span{overflow:hidden;text-overflow:ellipsis}.source-dot{width:calc(6px * var(--calendar-scale));height:calc(6px * var(--calendar-scale));border-radius:50%;flex:none}.outdated{flex:none;font-style:italic}
.all-day-entry{margin-top:calc(6px * var(--calendar-scale))}.all-day-title{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}.all-day-entry .source{font-size:calc(var(--source-font) * var(--component-scale,1));margin-top:calc(3px * var(--calendar-scale))}
.calendar-notice{font-size:calc(var(--source-font) * var(--component-scale,1));color:var(--muted);margin-bottom:calc(8px * var(--calendar-scale));overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.calendar-actions{display:flex;gap:calc(10px * var(--calendar-scale));margin-top:calc(12px * var(--calendar-scale))}.calendar-action{font:inherit;font-size:calc(var(--label-font) * var(--component-scale,1));min-height:48px;min-width:64px;padding:calc(8px * var(--calendar-scale)) calc(14px * var(--calendar-scale));border:1px solid var(--divider);border-radius:6px;background:var(--rail);color:var(--text);cursor:pointer}
.has-focus .calendar-heading{margin-bottom:calc(12px * var(--calendar-scale))}.has-focus .focus{padding-top:calc(8px * var(--calendar-scale))}.has-focus .badge{margin-bottom:calc(12px * var(--calendar-scale))}.has-focus .timing{margin-top:calc(12px * var(--calendar-scale));white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.has-focus .source{margin-top:calc(6px * var(--calendar-scale))}
.has-focus .next-event{margin-top:calc(12px * var(--calendar-scale));padding-top:calc(10px * var(--calendar-scale))}.next-event small,.next-event>.event-title{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.next-event small{margin-bottom:4px}
.calendar.compact{padding-top:0}.compact .focus{padding-top:0}.compact .calendar-heading{margin-bottom:8px}.compact .badge{margin-bottom:6px}.compact .timing,.compact .source{margin-top:4px}.compact .next-event{margin-top:6px;padding-top:6px}.compact .calendar-actions{margin-top:6px}.compact .more{margin-top:4px}
.event-title{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;width:100%;min-height:44px;border:0;padding:0;background:transparent;color:inherit;font:inherit;letter-spacing:inherit;line-height:inherit;text-align:start;cursor:pointer;overflow-wrap:anywhere}
.event-title:focus-visible{outline-offset:-2px}
.event-details{max-width:min(640px,90vw);max-height:90dvh;overflow:auto;background:var(--background);color:var(--text);border:1px solid var(--divider);border-radius:10px;padding:24px;font-size:20px;line-height:1.5}
.event-details::backdrop{background:#0009}.event-details h2{display:block;overflow:visible;font-size:24px}.event-details p{white-space:pre-wrap;overflow-wrap:anywhere}.event-details button{min-width:80px;min-height:48px;background:transparent;color:inherit;border:1px solid var(--divider);border-radius:6px;font:inherit;padding:8px 16px}
.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
:host(.motion) .screen{transition:background-color .18s,color .18s}
:focus-visible{outline:2px solid var(--accent);outline-offset:4px}
@media(prefers-reduced-motion:reduce){:host(.motion) .screen{transition:none}}
`;
