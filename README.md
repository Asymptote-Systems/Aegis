<!-- Improved compatibility of back to top link: See: https://github.com/othneildrew/Best-README-Template/pull/73 -->
<a id="readme-top"></a>
<!--
*** Thanks for checking out the Best-README-Template. If you have a suggestion
*** that would make this better, please fork the repo and create a pull request
*** or simply open an issue with the tag "enhancement".
*** Don't forget to give the project a star!
*** Thanks again! Now go create something AMAZING! :D
-->




<!-- PROJECT SHIELDS -->
<!--
*** I'm using markdown "reference style" links for readability.
*** Reference links are enclosed in brackets [ ] instead of parentheses ( ).
*** See the bottom of this document for the declaration of the reference variables
*** for contributors-url, forks-url, etc. This is an optional, concise syntax you may use.
*** https://www.markdownguide.org/basic-syntax/#reference-style-links
-->
<div align="center">


[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![project_license][license-shield]][license-url]
[![LinkedIn][linkedin-shield]][linkedin-url]
</div>



<!-- PROJECT LOGO -->
<br />
<div align="center">



```
                    ░█████╗░███████╗░██████╗░██╗░██████╗
                    ██╔══██╗██╔════╝██╔════╝░██║██╔════╝
                    ███████║█████╗░░██║░░██╗░██║╚█████╗░
                    ██╔══██║██╔══╝░░██║░░╚██╗██║░╚═══██╗
                    ██║░░██║███████╗╚██████╔╝██║██████╔╝
                    ╚═╝░░╚═╝╚══════╝░╚═════╝░╚═╝╚═════╝░


```


  <p align="center">
    
ProctorAegis is a professional-grade platform designed to streamline lab-based coding assessments in academic institutions. It automates scheduling, delivery, evaluation, result reporting and performance monitoring of programming exams while ensuring academic integrity, Reliability, Maintainability and Scalability. 
    <br />
    <a href="https://github.com/github_username/repo_name"><strong>Explore the docs »</strong></a>
    <br />
    <br />
  </p>
</div>




<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li>
  </ol>
</details>




<!-- ABOUT THE PROJECT -->



### Built With


[![React][React.js]][React-url] [![FastAPI][FastAPI]][FastAPI-url] [![PostgreSQL][PostgreSQL]][PostgreSQL-url] [![Redis][Redis]][Redis-url] [![RabbitMQ][RabbitMQ]][RabbitMQ-url] [![Docker][Docker]][Docker-url] [![Nginx][Nginx]][Nginx-url] [![Grafana][Grafana]][Grafana-url] [![Prometheus][Prometheus]][Prometheus-url]


<p align="right">(<a href="#readme-top">back to top</a>)</p>




<!-- GETTING STARTED -->
## 🚀 Getting Started


ProctorAegis comes with a **menu-driven management interface** — no complex Docker or CLI commands required.


### 🧩 Prerequisites


Before starting, make sure you have:


- **Docker** ≥ 24.0  
- **Docker Compose** ≥ v2  
- **Python 3.10+** (pre-installed on Ubuntu)
- **Ubuntu 20.04 LTS** *(recommended)*  
  > ⚠️ Code evaluation (sandboxed execution) works **only on native Linux (Ubuntu 20.04)**.  
  Windows/WSL systems will skip Judge0-related services automatically.


You can verify your setup:
```bash
docker --version
docker compose version
python3 --version
```


### Installation


### 1️⃣ Clone the Repository and transer docker-compose.yml file from the drive to the root of the folder


```bash
git clone https://github.com/Asymptote-Systems/Aegis.git
cd Aegis


# Shift docker-compose.yml file from the drive to the root of the folder
```


### 2️⃣ Setup Environment Variables


A sample environment file is provided for convenience.  
Duplicate it and update the secrets and credentials as required
AND KEEP A COPY IN THE FRONTEND FOLDER TOO:


```bash
cp .env.template .env
cp .env.template frontend/.env
```


### 3️⃣ Launch the Menu Manager


Run the interactive control panel:


```bash
python manage.py
```


<p align="right">(<a href="#readme-top">back to top</a>)</p>

## ✅ Post-deployment workflow (After deployment)

1. Refer to the `.env` file for the default admin credentials and log in.
2. Go to **User Management**, download the sample Excel sheet for bulk student import, then upload it to the database as directed.
3. Go to **Course Management**, create a course, and do **mass enrollment** for the desired students.
4. Return to **User Management** and create a teacher profile accordingly.
5. Log out, refresh the page, and log in as the teacher using the teacher credentials.
6. Go to **Questions** → click **Import Questions**.  
   **Very important:** Modify test cases as required based on user input and never use the given examples as-is.
7. Go to **Create Exams** and create an exam as directed. Set exam type to **Midterm** or **Final** for proper coding assessment, and use **Practice** for questions with solutions.
8. Enroll students for the exam and select an ample number of questions (or adjust question allotment using **Smart Assign Pool**), otherwise warnings may appear and questions may not be assignable.
9. Click **Assign** next to the created exam to make it available to enrolled students at the scheduled time.
10. Log out as teacher (refresh) and log in as a student using credentials from the uploaded Excel sheet.
11. Click **Start Exam**, attempt the exam, verify using **Run Code** according to the test-case format, then submit.
12. As teacher, go to **Results** → click **Process Submissions** for automated evaluation using the configured test cases (errors depend on test-case format and exact STDIN/STDOUT).
13. Go to **View Results** to see evaluated submissions student-wise.

<p align="right">(<a href="#readme-top">back to top</a>)</p>


<!--  EXAMPLES -->
## Usage


Once launched, you’ll see an interactive menu like this:


```
💡 Welcome to the Docker Manager
Easy control panel for your services 🚀


┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  Option  ┃  Command       ┃  Description                      ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃  1       ┃  start         ┃  🚀 Start all services            ┃
┃  2       ┃  stop          ┃  🛑 Stop all services             ┃
┃  3       ┃  restart       ┃  🔄 Restart services              ┃
┃  4       ┃  reset-db      ┃  ⚠️ Reset the database            ┃
┃  5       ┃  status        ┃  📊 Show running services         ┃
┃  6       ┃  update        ┃  ⬇️ Update Docker images          ┃
┃  7       ┃  clean         ┃  🧹 Remove everything             ┃
┃  8       ┃  urls          ┃  🌐 Show all service URLs         ┃
┃  9       ┃  backup-db     ┃  💾 Backup the database           ┃
┃  10      ┃  restore-db    ┃  ♻️ Restore the database          ┃
┃  0       ┃  exit          ┃  👋 Exit the manager              ┃
┃  -1      ┃  factory-reset ┃  ☠️ Build everything from scratch ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```


Simply **enter a number** (1–10) to perform the desired operation.  
For example:


- **Press `1`** → Start all Docker containers and secrets setup (ALWAYS DO THIS INITIALLY. IF YOU ARE USING WSL do "chmod 644 secrets/private.pem" after running 1)
    
- **Press `5`** → Check running services
    
- **Press `9`** → Backup your PostgreSQL database
    
- **Press `-1`** → Rebuild everything from scratch
    


No manual Docker or script commands needed — it’s fully automated and interactive.


_For more examples, please refer to the Documentation_


<p align="right">(<a href="#readme-top">back to top</a>)</p>




<!-- LICENSE -->
## 🧾 License


Distributed under the **MIT License**. See `LICENSE.txt` for more information.


<p align="right">(<a href="#readme-top">back to top</a>)</p>


<!-- ACKNOWLEDGMENTS -->
## 🙌 Acknowledgments


Special thanks to open-source communities and technologies that made this project possible:


* FastAPI
* React
* Docker
* Redis
* RabbitMQ
* PostgreSQL
* Judge0


<p align="right">(<a href="#readme-top">back to top</a>)</p>





<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->
[contributors-shield]: https://img.shields.io/github/contributors/Asymptote-Systems/ProctorAegis.svg?style=for-the-badge
[contributors-url]: https://github.com/Asymptote-Systems/ProctorAegis/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/Asymptote-Systems/ProctorAegis.svg?style=for-the-badge
[forks-url]: https://github.com/Asymptote-Systems/ProctorAegis/network/members
[stars-shield]: https://img.shields.io/github/stars/Asymptote-Systems/ProctorAegis.svg?style=for-the-badge
[stars-url]: https://github.com/Asymptote-Systems/ProctorAegis/stargazers
[issues-shield]: https://img.shields.io/github/issues/Asymptote-Systems/ProctorAegis.svg?style=for-the-badge
[issues-url]: https://github.com/Asymptote-Systems/ProctorAegis/issues
[license-shield]: https://img.shields.io/github/license/Asymptote-Systems/ProctorAegis.svg?style=for-the-badge
[license-url]: https://github.com/Asymptote-Systems/ProctorAegis/blob/master/LICENSE.txt
[linkedin-shield]: https://img.shields.io/badge/-LinkedIn-black.svg?style=for-the-badge&logo=linkedin&colorB=555
[linkedin-url]: https://linkedin.com/in/advaith-balaji
[product-screenshot]: images/screenshot.png
<!-- Shields.io badges. You can a comprehensive list with many more badges at: https://github.com/inttter/md-badges -->
[React.js]: https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB
[React-url]: https://react.dev/
[FastAPI]: https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white
[FastAPI-url]: https://fastapi.tiangolo.com/
[PostgreSQL]: https://img.shields.io/badge/PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white
[PostgreSQL-url]: https://www.postgresql.org/
[Redis]: https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white
[Redis-url]: https://redis.io/
[RabbitMQ]: https://img.shields.io/badge/RabbitMQ-FF6600?style=for-the-badge&logo=rabbitmq&logoColor=white
[RabbitMQ-url]: https://www.rabbitmq.com/
[Docker]: https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white
[Docker-url]: https://www.docker.com/
[Nginx]: https://img.shields.io/badge/Nginx-009639?style=for-the-badge&logo=nginx&logoColor=white
[Nginx-url]: https://www.nginx.com/
[Grafana]: https://img.shields.io/badge/Grafana-F46800?style=for-the-badge&logo=grafana&logoColor=white
[Grafana-url]: https://grafana.com/
[Prometheus]: https://img.shields.io/badge/Prometheus-E6522C?style=for-the-badge&logo=prometheus&logoColor=white
[Prometheus-url]: https://prometheus.io/
