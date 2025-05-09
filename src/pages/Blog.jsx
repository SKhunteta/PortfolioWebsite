import React from "react";

const Blog = () => {
  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold mb-8 section-title">Blog</h1>
        <div className="prose prose-lg max-w-none">
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Technical writing and industry insights coming soon...
          </p>
        </div>
      </div>
    </section>
  );
};

export default Blog;
