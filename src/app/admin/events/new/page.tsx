import EventForm from '@/components/admin/EventForm';
import { PageHeader } from '@/components/admin/ui';

export const metadata = { title: 'New event' };

export default function NewEventPage() {
  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Create an event"
        subtitle="This generates the guest page and its QR code."
      />
      <EventForm />
    </div>
  );
}
