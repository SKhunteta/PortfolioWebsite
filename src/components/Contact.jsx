import React from "react";
import { FaLinkedin, FaGithub } from "react-icons/fa";

const Contact = () => {
  return (
    <div id="contact" className="section-container py-12 md:py-16">
      <div className="text-center mb-8">
        <h2 className="section-title mx-auto">Let's Connect</h2>
        <p className="section-subtitle">
          The best way to reach me is through LinkedIn
        </p>
      </div>

      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-custom-lg overflow-hidden">
        <div className="grid md:grid-cols-2">
          {/* Left side - image/illustration */}
          <div className="bg-gradient-to-br from-primary to-accent p-8 text-white flex flex-col justify-center items-center">
            <div className="mb-6 w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-white/30 mx-auto">
              <img
                src="./images/ShreyPic2.jpg"
                alt="Shreyans Khunteta"
                className="w-full h-full object-cover"
              />
            </div>
            <h3 className="text-2xl font-bold mb-2 text-center">
              Shreyans Khunteta
            </h3>
            <p className="mb-4 text-white/80 text-center leading-relaxed">
              Senior Software Engineer passionate about creating innovative
              solutions
            </p>
            <div className="w-16 h-1 bg-white/30 rounded-full mb-4"></div>
            <p className="text-white/90 text-center text-sm italic">
              "Building technology that matters"
            </p>
          </div>

          {/* Right side - LinkedIn focus */}
          <div className="p-8 flex flex-col justify-center">
            <p className="text-gray-600 mb-6 leading-relaxed">
              I'm always excited to connect with fellow engineers, builders, and
              curious minds. The best way to reach me is on LinkedIn—whether
              you're exploring ideas, building something ambitious, or just want
              to exchange insights.
            </p>

            <div className="bg-gray-50 rounded-lg p-4 mb-6 border-l-4 border-primary">
              <p className="text-gray-700 mb-4">
                If you're interested in chatting about:
              </p>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start">
                  <span className="text-xl mr-3">🚀</span>
                  <span>New projects or collaborations</span>
                </li>
                <li className="flex items-start">
                  <span className="text-xl mr-3">🧠</span>
                  <span>Technical challenges or systems architecture</span>
                </li>
                <li className="flex items-start">
                  <span className="text-xl mr-3">🤝</span>
                  <span>Strategic partnerships or innovative ideas</span>
                </li>
              </ul>
            </div>

            <p className="text-gray-600 mb-6 italic">
              Feel free to reach out—I'd love to hear from you.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="https://www.linkedin.com/in/shreyans-khunteta-3167247a/"
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary flex items-center justify-center py-3 px-5 rounded-lg transition-all"
              >
                <span className="flex items-center">
                  <FaLinkedin
                    size={24}
                    className="text-white"
                    aria-hidden="true"
                  />
                  <span className="ml-3 font-medium">Connect on LinkedIn</span>
                </span>
              </a>

              <a
                href="https://github.com/SKhunteta"
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary flex items-center justify-center py-3 px-5 rounded-lg transition-all"
              >
                <span className="flex items-center">
                  <FaGithub
                    size={24}
                    className="text-primary"
                    aria-hidden="true"
                  />
                  <span className="ml-3 font-medium">Check out my GitHub</span>
                </span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
