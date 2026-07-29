begin;

delete from public.notification_deliveries as duplicate
using public.notification_deliveries as keeper
where duplicate.id <> keeper.id
  and duplicate.inquiry_id = keeper.inquiry_id
  and duplicate.channel = keeper.channel
  and duplicate.recipient = keeper.recipient
  and duplicate.created_at > keeper.created_at;

create unique index if not exists notification_deliveries_inquiry_recipient_key
  on public.notification_deliveries(inquiry_id, channel, recipient);

commit;
