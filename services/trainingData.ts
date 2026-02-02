
import { TrainingModule } from "../types";

// This simulates fetching from I:\pageindex\extract\training_modules
export const trainingModules: TrainingModule[] = [
  {
    id: "rice-pro",
    title: "ধানের প্রধান রোগ ও প্রতিকার",
    description: "ব্লাইট, ব্লাস্ট এবং টুংরো রোগ শনাক্তকরণ প্রোটোকল।",
    iconName: "Sprout",
    localDataPath: "extract/training_modules/rice_bd",
    lessons: [
      {
        title: "রাইস ব্লাস্ট (ID 25)",
        content: "পাতায় চোখের মতো (Eye-shaped) দাগ যার মাঝখানটা ছাই রঙ এবং কিনারা বাদামী। এটি একটি বিধ্বংসী ছত্রাকজনিত রোগ।",
        tip: "অতিরিক্ত ইউরিয়া সার এই রোগের ঝুঁকি বাড়ায়।"
      },
      {
        title: "ব্যাকটেরিয়াল লিফ ব্লাইট (BLB)",
        content: "পাতার ওপর থেকে লম্বাটে হলুদাভ রেখা দেখা যায়। ভোরের বেলা পাতায় ব্যাকটেরিয়ার হলুদ দানা (Ooze) দেখা যেতে পারে।"
      }
    ],
    flashcards: [
      { id: "f1", front: "পাতায় চোখের মতো দাগ। মাঝখান ধূসর।", back: "রাইস ব্লাস্ট (ছত্রাক)" },
      { id: "f2", front: "ভোরে পাতার ডগায় হলুদ দানার মতো চিহ্ন।", back: "ব্যাকটেরিয়াল উজিং (Bacteria)" }
    ],
    quizzes: [
      {
        id: "q1",
        question: "ধানের পাতায় 'চোখের মতো' দাগ হলে তা কোন রোগের লক্ষণ?",
        options: ["টুংরো", "ব্লাস্ট", "বিএলবি", "পুষ্টির অভাব"],
        correctIndex: 1,
        explanation: "রাইস ব্লাস্টের প্রধান বৈশিষ্ট্য হলো চোখের মতো বা মাকু আকৃতির দাগ।"
      }
    ]
  },
  {
    id: "potato-expert",
    title: "আলুর লেট ব্লাইট মাস্টারক্লাস",
    description: "আলুর মড়ক বা লেট ব্লাইট দমনে CABI প্রোটোকল।",
    iconName: "FlaskConical",
    localDataPath: "extract/training_modules/potato_bd",
    lessons: [
      {
        title: "শনাক্তকরণ (ID 35)",
        content: "পাতার কিনারা থেকে জলছাপের মতো দাগ শুরু হয়ে দ্রুত ছড়িয়ে পড়ে। স্যাঁতস্যাঁতে আবহাওয়ায় পাতার উল্টো দিকে সাদা পাউডারের মতো আবরণ দেখা যায়।",
        tip: "যদি আবহাওয়া কুয়াশাচ্ছন্ন থাকে, তবে দেরি না করে ব্যবস্থা নিন।"
      }
    ],
    flashcards: [
      { id: "pf1", front: "পাতার নিচে সাদা তুলোর মতো আবরণ।", back: "লেট ব্লাইট (ছত্রাক)" }
    ],
    quizzes: [
      {
        id: "pq1",
        question: "লেট ব্লাইট দমনে কখন স্প্রে করা সবচেয়ে কার্যকর?",
        options: ["বৃষ্টির ঠিক আগে", "সকালে কুয়াশা থাকতে", "সূর্যাস্তের পর", "রোগ হওয়ার আগে (প্রতিরোধক)"],
        correctIndex: 3,
        explanation: "লেট ব্লাইট প্রতিরোধের জন্য আবহাওয়া বুঝে রোগ আসার আগেই স্প্রে করা শ্রেয়।"
      }
    ]
  },
  {
    id: "mango-care",
    title: "আমের রোগ ব্যবস্থাপনা",
    description: "অ্যানথ্রাকনোজ ও আমের কুঁড়ি বিকৃতি (Malformation) দমন।",
    iconName: "Target",
    localDataPath: "extract/training_modules/mango_bd",
    lessons: [
      {
        title: "অ্যানথ্রাকনোজ (ID 42)",
        content: "কচি পাতা ও ফলে কালো রঙের ছোট ছোট গোল দাগ। পরে এই দাগগুলো বড় হয়ে ফেটে যায়।",
        tip: "বাগান পরিষ্কার রাখা এবং মরা ডাল ছাঁটাই করা জরুরি।"
      }
    ],
    flashcards: [
      { id: "mf1", front: "মুজুরি বা ফলে কালো রঙের ছোট দাগ।", back: "অ্যানথ্রাকনোজ" }
    ],
    quizzes: [
      {
        id: "mq1",
        question: "আমের কচি পাতায় কালো দাগ হলে তা কোন রোগ নির্দেশ করে?",
        options: ["মোজাইক", "অ্যানথ্রাকনোজ", "উইল্ট", "মড়ক"],
        correctIndex: 1,
        explanation: "আমের জন্য অ্যানথ্রাকনোজ একটি সাধারণ ছত্রাকজনিত রোগ যা কালো দাগ তৈরি করে।"
      }
    ]
  }
];

export const getModuleById = (id: string) => trainingModules.find(m => m.id === id);
