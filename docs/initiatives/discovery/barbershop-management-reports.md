# Barbershop Management Reports Discovery

## Status

Discovery draft for product validation. This document does not approve implementation scope.

## Problem Statement

Barbershop owners and professionals need to turn operational history into concrete decisions about
revenue, capacity, team performance, customer return, and cash obligations. A generic export of the
currently selected period does not communicate which question it answers, how each metric is
calculated, or what action the user can take next.

The reporting product should therefore lead with named business questions and stable definitions,
not with an undifferentiated PDF/CSV action.

## Personas And Decisions

### Owner or manager

- Verify daily and monthly revenue and reconcile payment methods.
- Understand which professionals and services drive revenue and demand.
- Decide whether available working time is underused or overloaded.
- Calculate commissions owed without rewriting historical facts.
- Identify cancellation, no-show, and punctuality problems.
- Understand whether customers return and who may need reactivation.
- Anticipate near-term demand from future bookings.

### Professional

- Understand personal revenue, completed services, average ticket, and commissions.
- Monitor utilization, cancellations, no-shows, and schedule gaps.
- Understand personal customer return and rebooking without seeing another professional's private
  customer portfolio or financial data.

## Product Principles

1. Every report must state the question it answers, its calculation rules, data freshness, and the
   action it supports.
2. Dashboard signals and downloadable reports are different products. A dashboard highlights what
   needs attention; a report supports investigation, reconciliation, or sharing.
3. Empty reports remain discoverable. They explain which events are required to produce results.
4. Report names remain stable; filters refine a report but do not silently change its meaning.
5. Totals must reconcile with immutable paid-sale, reversal, and commission facts.
6. Percentages always expose numerator, denominator, exclusions, and comparison period.
7. Owner-wide and professional-self views use explicit capabilities and tenant-qualified queries.
8. PDF communicates a readable conclusion; CSV provides auditable detail. They are not identical
   byte representations of a generic summary.

## Recommended V1 Catalog

### 1. Sales and revenue

**Question:** How much did the barbershop earn, from what, and how does it compare with the previous
equivalent period?

Core metrics:

- gross paid service revenue;
- reversals and net revenue;
- paid sales and performed service items;
- average ticket per distinct paid sale;
- revenue by day, unit, professional, service, and payment method;
- absolute and percentage change against the previous equivalent period.

Primary actions: investigate a decline, change staffing, review prices, and reconcile the day.

Current readiness: most base facts already exist. Period comparison and a dedicated detail export
need explicit contracts.

### 2. Professional performance and commissions

**Question:** What did each professional deliver and how much is owed?

Core metrics:

- completed services and distinct paid sales;
- net service revenue;
- average ticket;
- immutable commission owed, reversed commission, and net commission;
- average performed duration and revenue per worked hour when reliable work-hour facts exist;
- comparison with the professional's own previous period, not a decontextualized leaderboard alone.

Primary actions: close commission payments, coach performance, and balance demand.

Current readiness: service revenue and commission snapshots exist. Worked-hour productivity needs
a validated attendance/work-time definition.

### 3. Schedule utilization and demand

**Question:** How much of the offered schedule was actually used, and where are the recurring gaps
or peaks?

Core metrics:

- available minutes;
- booked minutes;
- completed minutes;
- blocked/absent minutes;
- booking utilization = booked minutes / bookable available minutes;
- realized utilization = completed minutes / bookable available minutes;
- demand by weekday and hour;
- future booked capacity for the next 7, 14, and 30 days.

Primary actions: adjust opening hours, availability, staffing, and promotions.

Current readiness: availability and appointments exist, but overlap, rescheduling, cancellation,
and recurrence rules need one canonical utilization projection before this becomes financially
trusted.

### 4. Cancellations, no-shows, and service SLA

**Question:** Where is time being lost and which operational stage is failing?

Core metrics:

- cancellations and cancellation rate;
- no-shows and no-show rate;
- start punctuality: scheduled start to actual service start;
- customer wait: check-in to actual service start;
- service variance: actual duration minus planned duration;
- checkout delay: service completion to completed payment;
- percentage within separately configured targets for each metric.

Primary actions: change reminders/policies, address chronic delays, and improve front-desk flow.

Current readiness: cancellations/no-shows exist. SLA reporting must not be shipped until the product
confirms which lifecycle timestamps are authoritative and the business can configure or accept
explicit default targets.

### 5. Customer retention and reactivation

**Question:** Are customers returning at the expected cadence, and who is at risk of not returning?

Core metrics:

- unique customers served;
- new and returning customers;
- return rate with visible numerator and denominator;
- rebooked within 24 hours of service completion;
- returned within the expected service cadence;
- customers due soon, overdue, and reactivated;
- top customers by visits and net spend.

Recommended definition:

- avoid a universal `active in 30 days` label;
- classify activity using the customer's last completed paid visit plus an expected return window;
- start with a configurable business default, such as 30 or 45 days, and later allow a service-level
  cadence;
- label customers without a stable identity as unknown and exclude them from retention rates.

Primary actions: contact overdue customers, measure loyalty, and improve rebooking.

Current readiness: new/returning and stable customer keys exist. Rebooking, cadence, due/overdue,
and reactivation require new definitions and queries. Contact actions require separate consent and
communication rules.

### 6. Services and pricing

**Question:** Which services create demand and revenue, and which may need pricing or duration
changes?

Core metrics:

- quantity, net revenue, average realized price, and average performed duration by service;
- service share of revenue;
- cancellation/no-show rate by service;
- utilization and demand by service where capacity attribution is valid;
- discount/override frequency when those facts are persisted.

Primary actions: change menu, pricing, duration, training, and promotion.

Current readiness: quantity and net revenue exist. Margin must remain out of scope until cost facts
exist; revenue must never be presented as profit.

### 7. Cash and payment reconciliation

**Question:** Do recorded sales, payment methods, reversals, and cash operations reconcile?

Core metrics:

- paid amount by payment method;
- cash opening, inflows, outflows, expected closing, counted closing, and difference;
- split-payment allocation;
- reversals by method;
- open or unreconciled operational days.

Primary actions: close the day, investigate differences, and provide an auditable record.

Current readiness: payment and cash facts exist. The report must reuse the authoritative cash-day
contract instead of recomputing a competing total.

## Priority

### Must have before calling reporting complete

1. A catalog with the seven named reports above.
2. A purpose, definition summary, supported filters, and empty-state explanation for each report.
3. Dedicated preview and PDF/CSV output for the selected report type.
4. Sales/revenue, professional/commission, cancellations/no-shows, customer new/returning, services,
   and cash reports using facts that already exist.
5. Explicit capability rules for owner-wide and professional-self access.

### Should have after metric contracts are validated

1. Schedule utilization and future capacity.
2. Rebooking, expected return cadence, overdue customers, and reactivation.
3. Period-over-period comparisons.
4. Configurable SLA targets and lifecycle timing reports.

### Not yet justified

- arbitrary custom report builders;
- AI-generated metrics or recommendations without stable definitions;
- profitability or margin without cost data;
- employee ranking presented without hours, role, tenure, and demand context;
- customer outreach without consent and channel-governance contracts.

## Evidence

- Square documents sales, payments, items, team, customer, and appointment report families rather
  than one generic export: <https://squareup.com/help/us/en/topic/reports>.
- Square's appointment performance report defines retention, pre-booking, and schedule utilization
  with explicit denominators and filters: <https://squareup.com/help/ca/en/article/7904-square-appointments-reporting>.
- Vagaro separates sales, payment distribution, employee, customer retention, rebooking,
  appointments, and cancellation/no-show reports: <https://support.vagaro.com/hc/en-us/categories/115000066113-Reports-and-Dashboard>.
- Vagaro's retention report supports drill-through by employee and appointment type:
  <https://support.vagaro.com/hc/en-us/articles/360000509994-Customer-Retention-Report>.

These sources demonstrate common report questions and definition patterns; they do not validate
that every metric has equal priority for Brazilian barbershops. Direct interviews and usage
observation remain necessary.

## Open Product Decisions

1. Which three questions do owners currently answer manually every week?
2. Does each professional see only personal financial/customer data, or are some team aggregates
   visible?
3. What return cadence should initially classify a customer as due or overdue?
4. Which SLA matters first: punctual start, customer wait, service duration, or checkout delay?
5. Is commission payment/settlement itself tracked, or only the amount accrued?
6. Which exports are needed for accounting, and which are intended for operational management?
7. Should future bookings be valued at catalog price, latest override, or not monetized until paid?

## Validation Plan

Interview at least five owners/managers and five working professionals. For each proposed report,
ask for the last real decision they made using that information, the workaround used today, the
frequency, and what action followed. Keep a report in V1 only when respondents can describe a
specific recurring decision and the TRIAD can define its data contract without invented facts.
