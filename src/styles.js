export const CARD_STYLES = `
:host{display:block;box-sizing:border-box;width:100%;height:var(--info-dashboard-height,100dvh);font-family:Arial,Helvetica,sans-serif}
*{box-sizing:border-box}[hidden]{display:none!important}
.screen{height:100%;width:100%;overflow:hidden;position:relative;background:var(--background);color:var(--text);display:grid;grid-template-columns:minmax(0,1fr) var(--rail-width)}
.screen.no-rail{grid-template-columns:minmax(0,1fr)}
.workspace{min-height:0;min-width:0;position:relative;display:grid;grid-template-columns:minmax(0,var(--left-width)) minmax(0,1fr);gap:var(--gap);padding:var(--pad);padding-bottom:calc(var(--pad) + var(--caption-space,0px))}
.workspace.single{grid-template-columns:minmax(0,1fr)}
.home{min-width:0;min-height:0;display:grid;grid-template-rows:auto minmax(0,1fr) auto}
.room{font-size:var(--label-font);color:var(--muted);text-transform:uppercase;letter-spacing:.12em;min-height:22px;display:flex;align-items:center;gap:10px;overflow-wrap:anywhere;line-height:1.3}
.room:before{content:'';width:6px;height:6px;border-radius:50%;background:currentColor;flex:none}
.timeblock{min-height:0;min-width:0;display:flex;flex-direction:column;justify-content:center;padding-block:12px}
.clock{display:flex;align-items:baseline;gap:.06em;font-size:var(--clock-font);line-height:1.08;white-space:nowrap;font-weight:400;letter-spacing:-.065em;font-variant-numeric:tabular-nums;direction:ltr;unicode-bidi:isolate;max-width:100%}
.period{font-size:.16em;letter-spacing:0;color:var(--muted)}
.date{font-size:var(--date-font);line-height:1.3;color:var(--muted);margin-top:16px;overflow-wrap:anywhere}
.footer{display:grid;gap:14px;min-width:0}
.readings{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px 24px;width:var(--readings-width);max-width:100%}
.reading{min-width:0;min-height:48px;overflow-wrap:anywhere;border:0;padding:0;background:transparent;color:inherit;font:inherit;text-align:start;border-radius:3px;cursor:pointer}.reading:disabled{opacity:1;cursor:default}
.reading strong{font-size:var(--reading-font);font-weight:400;line-height:1.2;letter-spacing:-.025em;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.reading small{font-size:.44em;color:var(--muted);letter-spacing:0;margin-inline-start:3px}
.reading span{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;font-size:var(--label-font);color:var(--muted);margin-top:6px;line-height:1.3}
.weather,.co2-caption{display:flex;align-items:center;gap:8px;color:var(--muted);font-size:var(--label-font);line-height:1.4;overflow-wrap:anywhere;min-width:0}
.weather-copy{min-width:0}.weather-copy>span{display:block}.forecast{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:.92em}.weather svg{width:22px;height:22px;stroke:currentColor;fill:none;stroke-width:1.6;flex:none}
.co2-caption span{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dot{background:var(--air-color,var(--muted));width:7px;height:7px;border-radius:50%;flex:none}
.rail-caption{position:absolute;bottom:14px;right:var(--pad);max-width:calc(100% - 2 * var(--pad))}
.calendar{min-width:0;min-height:0;border-inline-start:1px solid var(--divider);padding-inline-start:var(--gap);padding-top:var(--calendar-top);overflow:hidden}
.calendar-heading{display:flex;justify-content:space-between;align-items:center;gap:12px;color:var(--muted);font-size:var(--label-font);line-height:1.3;letter-spacing:.1em;text-transform:uppercase;margin-bottom:20px}
.calendar-heading small{font-size:.8em;letter-spacing:0;text-transform:none}
.all-day{font-size:var(--label-font);color:var(--muted);line-height:1.4;border-bottom:1px solid var(--divider);padding-bottom:12px;margin-bottom:4px;overflow-wrap:anywhere}
.all-day-heading{display:block;font-size:.8em;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px}
.event{padding:var(--event-padding) 0;border-bottom:1px solid var(--divider)}
.when{font-size:var(--when-font);color:var(--muted);margin-bottom:9px;line-height:1.3;overflow-wrap:anywhere}
h2{font-size:var(--event-font);font-weight:400;letter-spacing:-.025em;line-height:1.2;margin:0;overflow-wrap:anywhere;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}
.source{display:flex;align-items:center;gap:6px;white-space:nowrap;overflow:hidden;font-size:var(--source-font);color:var(--muted);margin-top:9px;line-height:1.3;overflow-wrap:anywhere}
.more,.notice{color:var(--muted);font-size:var(--label-font);line-height:1.4;margin-top:14px;overflow-wrap:anywhere}
.focus{padding-top:var(--focus-top)}
.badge{font-size:var(--label-font);color:var(--accent);text-transform:uppercase;letter-spacing:.1em;line-height:1.3;margin-bottom:18px}
.focus h2{font-size:var(--focus-font)}
.timing{font-size:var(--when-font);color:var(--muted);margin-top:18px;line-height:1.5}
.next-event{margin-top:24px;border-top:1px solid var(--divider);padding-top:16px;font-size:var(--when-font);line-height:1.4;color:var(--muted)}
.next-event small{font-size:.8em;display:block;margin-bottom:8px}
.air{position:relative;background:var(--rail);border-inline-start:1px solid var(--divider);min-width:0;overflow:hidden}
.air-fill{position:absolute;bottom:0;left:0;right:0;height:var(--air-fill,0%);background:var(--air-color,var(--muted))}
.air-top{position:absolute;top:var(--pad);left:3px;right:3px;text-align:center;font-size:var(--source-font);letter-spacing:.08em;color:var(--text);background:var(--background);border-radius:3px;padding:3px 0}
.air-value{position:absolute;bottom:24px;left:3px;right:3px;text-align:center;font-size:var(--when-font);color:var(--text);background:var(--background);border-radius:3px;padding:4px 0;overflow-wrap:anywhere}
.air-value small{display:block;font-size:12px;margin-top:3px}
.mark{position:absolute;right:0;width:8px;border-top:1px solid var(--text);opacity:.3}
.solo .room{justify-content:center}.solo .timeblock{text-align:center}.solo .clock{font-size:var(--solo-clock-font);justify-content:center}.solo .footer{justify-items:center}
.readings-only .home{grid-template-rows:auto minmax(0,1fr)}.readings-only .timeblock{display:none}.readings-only .footer{align-self:center;justify-items:center}
.no-clock.has-calendar .workspace:not(.single){grid-template-columns:minmax(0,32%) minmax(0,1fr)}
.no-clock .footer{align-self:center}.no-clock .timeblock{justify-content:flex-start}
.calendar-only .calendar{border:0;padding-inline-start:0}.calendar-only .focus h2{font-size:calc(var(--focus-font) * 1.25)}
.source-chip{display:inline-flex;align-items:center;gap:4px;min-width:0}.source-chip>span{overflow:hidden;text-overflow:ellipsis}.source-dot{width:6px;height:6px;border-radius:50%;flex:none}.outdated{flex:none;font-style:italic}
.all-day-entry{margin-top:6px}.all-day-title{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}.all-day-entry .source{font-size:var(--source-font);margin-top:3px}
.calendar-notice{font-size:var(--source-font);color:var(--muted);margin-bottom:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.calendar-actions{display:flex;gap:10px;margin-top:12px}.calendar-action{font:inherit;font-size:var(--label-font);min-height:48px;min-width:64px;padding:8px 14px;border:1px solid var(--divider);border-radius:6px;background:var(--rail);color:var(--text);cursor:pointer}
.has-focus .calendar-heading{margin-bottom:12px}.has-focus .focus{padding-top:8px}.has-focus .badge{margin-bottom:12px}.has-focus .timing{margin-top:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.has-focus .source{margin-top:6px}
.has-focus .next-event{margin-top:12px;padding-top:10px}.next-event small,.next-event>.event-title{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.next-event small{margin-bottom:4px}
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
