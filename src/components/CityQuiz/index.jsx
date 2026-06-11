import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import ViewSourceLink from "../ViewSourceLink";
import useQuizGenerator from "./useQuizGenerator";
import CitySelector from "./CitySelector";
import LoadingState from "./LoadingState";
import QuestionCard from "./QuestionCard";
import ResultsScreen from "./ResultsScreen";
import ErrorState from "./ErrorState";
import { STATES } from "./constants";

const CityQuiz = () => {
  const { data, loading, error, errorType, generate, reset } = useQuizGenerator();
  const [phase, setPhase] = useState(STATES.SELECTING);
  const [pendingCity, setPendingCity] = useState("");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState([]);

  useEffect(() => {
    document.title = "How Well Do You Know Your City? · Built by Shrey";
  }, []);

  useEffect(() => {
    if (loading) {
      setPhase(STATES.LOADING);
    } else if (errorType) {
      setPhase(STATES.ERROR);
    } else if (data) {
      setPhase(STATES.PLAYING);
      setQuestionIndex(0);
      setAnswers([]);
    }
  }, [loading, errorType, data]);

  const handleSubmit = (city) => {
    setPendingCity(city);
    setQuestionIndex(0);
    setAnswers([]);
    generate(city);
  };

  const handleAnswer = (correct) => {
    setAnswers((prev) => [...prev, correct]);
  };

  const handleNext = () => {
    if (data && questionIndex + 1 >= data.questions.length) {
      setPhase(STATES.COMPLETE);
    } else {
      setQuestionIndex((prev) => prev + 1);
    }
  };

  const handlePlayAgain = () => {
    setQuestionIndex(0);
    setAnswers([]);
    setPhase(STATES.PLAYING);
  };

  const handleTryAnother = () => {
    reset();
    setQuestionIndex(0);
    setAnswers([]);
    setPendingCity("");
    setPhase(STATES.SELECTING);
  };

  return (
    <div className="min-h-screen bg-[#FAFAF7] flex flex-col">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link
            to="/"
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
          >
            ← Back to portfolio
          </Link>
          <div className="flex items-center gap-4">
            <span
              className="text-xs uppercase tracking-widest text-gray-400"
              style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
            >
              City Quiz
            </span>
            <ViewSourceLink
              dir="src/components/CityQuiz"
              className="text-xs text-gray-400"
            />
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 sm:px-6 py-10 sm:py-16">
        <AnimatePresence mode="wait">
          {phase === STATES.SELECTING && (
            <CitySelector key="selector" onSubmit={handleSubmit} disabled={loading} />
          )}

          {phase === STATES.LOADING && (
            <LoadingState key="loading" city={pendingCity} />
          )}

          {phase === STATES.PLAYING && data && data.questions[questionIndex] && (
            <QuestionCard
              key={`q-${questionIndex}`}
              question={data.questions[questionIndex]}
              index={questionIndex}
              total={data.questions.length}
              onAnswer={handleAnswer}
              onNext={handleNext}
            />
          )}

          {phase === STATES.COMPLETE && data && (
            <ResultsScreen
              key="results"
              data={data}
              answers={answers}
              onPlayAgain={handlePlayAgain}
              onTryAnother={handleTryAnother}
            />
          )}

          {phase === STATES.ERROR && (
            <ErrorState
              key="error"
              error={error}
              errorType={errorType}
              onRetry={pendingCity ? () => generate(pendingCity) : null}
              onTryAnother={handleTryAnother}
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default CityQuiz;
