import "./PesticideNextPortal.css";

const APP_URL = "https://pesticide.krishiai.live/";

export default function PesticideNextPortal({ onBack }) {
  return (
    <section
      className="pesticide-portal"
      aria-label="PesticideNext application"
    >
      <header className="pesticide-portal__header">
        <button
          className="pesticide-portal__back"
          type="button"
          onClick={onBack}
          aria-label="Back to CABI Diagnosis home"
        >
          <span aria-hidden="true">←</span>
          CABI Diagnosis-এ ফিরুন
        </button>

        <div className="pesticide-portal__identity">
          <strong>PesticideNext</strong>
          <span>DAE বালাইনাশক তথ্য, নিরাপদ ব্যবহার ও MoA ব্যবস্থাপনা</span>
        </div>

        <a
          className="pesticide-portal__external"
          href={APP_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          নতুন ট্যাবে খুলুন ↗
        </a>
      </header>

      <div className="pesticide-portal__frame">
        <iframe
          title="PesticideNext — বালাইনাশক ব্যবস্থাপনা"
          src={APP_URL}
          loading="eager"
          referrerPolicy="strict-origin-when-cross-origin"
          allow="camera; microphone; geolocation; clipboard-read; clipboard-write"
          allowFullScreen
        />
      </div>

      <p className="pesticide-portal__hint">
        এম্বেড করা অ্যাপ লোড না হলে “নতুন ট্যাবে খুলুন” ব্যবহার করুন। CABI-তে
        ফিরতে উপরের সবুজ বাটনটি চাপুন।
      </p>
    </section>
  );
}
