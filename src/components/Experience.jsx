import React from 'react';

const Experience = () => {
  const experiences = [
    {
      id: 1,
      company: "Southeast Bank",
      position: "Senior Software Engineer",
      duration: "July 2023 - Present",
      location: "Seattle, WA",
      description: [
        "Led development of a Loan Origination System (LOS) using Blazor and MS SQL Server, delivering dynamic and interactive screens based on business-driven wireframes.",
        "Enhanced data security and compliance by implementing a custom encryption service to secure database columns with confidential client data.",
        "Integrated Equifax API for real-time credit score retrieval, automating the credit review process and reducing manual effort.",
        "Optimized legacy application with Moq unit tests to improve code reliability and streamline future updates."
      ]
    },
    {
      id: 2,
      company: "Moxe Health",
      position: "Software Engineer",
      duration: "June 2022 - April 2023",
      location: "Tacoma, WA",
      description: [
        "Refactored massive monolithic .Net application into containerized .Net Core microservices using Docker.",
        "Created a greenfield multi-cloud data pipeline for a major health insurer using both AWS and Google Cloud Services.",
        "Created APIs to be consumed by internal and external applications.",
        "Worked with team to process csv files, convert them to FHIR API bundle, track progress through Camunda workflow engine."
      ]
    },
    {
      id: 3,
      company: "PacificSource Health Plans",
      position: "Backend Software Developer",
      duration: "April 2020 - June 2022",
      location: "Eugene, OR",
      description: [
        "Designed and implemented internal .NET web application to house multiple team tools targeted toward improving provider data.",
        "Built C# tool for consuming CSV roster files and streaming data into staging database.",
        "Leveraged Informatica PowerCenter to cleanse and standardize data for loading into Master Data Management (MDM) database environment.",
        "Brought said new MDM system online to complete major company initiative."
      ]
    },
    {
      id: 4,
      company: "COVID Response Collective",
      position: "Founder",
      duration: "March 2020 - September 2022",
      location: "Corvallis, OR",
      description: [
        "Created and organized a 300 person registered nonprofit and volunteer mutual aid network.",
        "Coordinated deliveries of groceries to immunocompromised people and rent assistance to those in need.",
        "Managed internship of Oregon State University students, assigning social media/graphic design work approved for college credit.",
        "Organized mask deliveries to multiple indigenous communities."
      ]
    }
  ];

  return (
    <div id="experience" className="w-full p-6 py-16">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-primary tracking-widest uppercase">Work Experience</h2>
        <div className="border-b border-gray-300 my-4"></div>
        
        <div className="mt-8">
          {experiences.map((exp) => (
            <div key={exp.id} className="mb-12">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                <h3 className="text-2xl font-semibold text-primary">{exp.position} | {exp.company}</h3>
                <p className="text-gray-500">{exp.duration}</p>
              </div>
              <p className="text-gray-600 mb-4">{exp.location}</p>
              <ul className="list-disc pl-5">
                {exp.description.map((item, index) => (
                  <li key={index} className="text-secondary py-1">{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Experience;