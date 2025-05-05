import React from "react";
import { FaGithub, FaLinkedin } from "react-icons/fa";
import { HiOutlineMail } from "react-icons/hi";

const Footer = () => {
  return (
    <footer className="bg-dark text-white py-12 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent"></div>
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-primary/20 rounded-full blur-2xl"></div>
      <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-accent/20 rounded-full blur-3xl"></div>

      <div className="container-wide relative z-10">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <div>
            <a
              href="#home"
              className="text-3xl font-bold font-display mb-4 inline-block"
            >
              <span className="gradient-text">SK</span>
            </a>
            <p className="text-gray-300 mt-2 max-w-xs">
              Building innovative solutions that drive business value through
              clean, scalable code.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="#home"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Home
                </a>
              </li>
              <li>
                <a
                  href="#about"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  About
                </a>
              </li>
              <li>
                <a
                  href="#experience"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Experience
                </a>
              </li>
              <li>
                <a
                  href="#projects"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Projects
                </a>
              </li>
              <li>
                <a
                  href="#contact"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Contact
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-4">Get In Touch</h3>
            <div className="flex items-center space-x-4 mb-4">
              <a
                href="https://www.linkedin.com/in/shreyans-khunteta-3167247a/"
                target="_blank"
                rel="noreferrer"
                className="bg-gray-dark hover:bg-gray-700 rounded-full p-3 transition-colors"
                aria-label="LinkedIn"
              >
                <FaLinkedin size={20} className="text-white" />
              </a>
              <a
                href="https://github.com/SKhunteta"
                target="_blank"
                rel="noreferrer"
                className="bg-gray-dark hover:bg-gray-700 rounded-full p-3 transition-colors"
                aria-label="GitHub"
              >
                <FaGithub size={20} className="text-white" />
              </a>
              <a
                href="mailto:shreyans.khunteta@gmail.com"
                className="bg-gray-dark hover:bg-gray-700 rounded-full p-3 transition-colors"
                aria-label="Email"
              >
                <HiOutlineMail size={20} className="text-white" />
              </a>
            </div>
            <p className="text-gray-300">
              <a
                href="mailto:shreyans.khunteta@gmail.com"
                className="hover:text-white transition-colors"
              >
                shreyans.khunteta@gmail.com
              </a>
            </p>
          </div>
        </div>

        <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm">
            © {new Date().getFullYear()} Shreyans Khunteta. All rights reserved.
          </p>
          <p className="text-gray-400 text-sm mt-2 md:mt-0">
            Built with <span className="text-accent">♥</span> using React & Vite
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
