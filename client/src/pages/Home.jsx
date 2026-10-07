import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import Navbar from "../component/Navbar";
import Footer from "../component/Footer";

import "../styles/home.css";

import vibelyLogo from "../assets/vibely-logo.png";
import hotelImage from "../assets/hotel.jpg";
import concertImage from "../assets/concert.jpg";
import stayImage from "../assets/luxury.avif";
import foodImage from "../assets/foods.jpg";
import breakfastImage from "../assets/fooood.jpg";

const Home = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const heroSlides = [
    {
      id: 1,
      image: hotelImage,
      eyebrow: "CELEBRATIONS · MOMENTS · MEMORIES",
      title: "Celebrate",
      highlight: "beautifully.",
      description:
        "Discover beautiful experiences made for life's biggest celebrations, intimate moments and unforgettable memories.",
      buttonText: "Discover Events",
      link: "/events",
      sideLabel: "SPECIAL MOMENTS",
    },
    {
      id: 2,
      image: concertImage,
      eyebrow: "LIVE EVENTS · MUSIC · EXPERIENCES",
      title: "Feel the",
      highlight: "moment.",
      description:
        "Discover concerts, live shows and unforgettable experiences made for nights you will always remember.",
      buttonText: "Explore Events",
      link: "/events",
      sideLabel: "LIVE EXPERIENCES",
    },
    
    {
      id: 3,
      image: breakfastImage,
      eyebrow: "CONNECT · DISCOVER · EXPERIENCE",
      title: "Where ideas meet",
      highlight: "opportunity.",
      description:
        "Find inspiring experiences, communities and gatherings that bring the right people and ideas together.",
      buttonText: "Browse Events",
      link: "/events",
      sideLabel: "MEET & CONNECT",
    },
    {
      id: 4,
      image: stayImage,
      eyebrow: "APARTMENTS · COMFORT · STYLE",
      title: "Stay",
      highlight: "beautifully.",
      description:
        "Discover beautiful apartments designed for comfort, privacy and memorable stays whenever you need a space of your own.",
      buttonText: "Explore Apartments",
      link: "/apartments",
      sideLabel: "PREMIUM SPACES",
    },
    {
      id: 5,
      image: foodImage,
      eyebrow: "FOOD · FLAVOUR · GOOD MOMENTS",
      title: "Taste the",
      highlight: "experience.",
      description:
        "Discover delicious food, beautiful flavours and meals worth sharing with the people who make every moment better.",
      buttonText: "Explore Food",
      link: "/food",
      sideLabel: "GOOD FOOD",
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((previousSlide) =>
        previousSlide === heroSlides.length - 1
          ? 0
          : previousSlide + 1
      );
    }, 6000);

    return () => clearInterval(interval);
  }, [heroSlides.length]);

  const nextSlide = () => {
    setCurrentSlide((previousSlide) =>
      previousSlide === heroSlides.length - 1
        ? 0
        : previousSlide + 1
    );
  };

  const previousSlide = () => {
    setCurrentSlide((previousSlide) =>
      previousSlide === 0
        ? heroSlides.length - 1
        : previousSlide - 1
    );
  };

  return (
    <main className="home-page">
      <Navbar />

      <section className="luxury-hero">
        {heroSlides.map((slide, index) => (
          <div
            key={slide.id}
            className={`luxury-hero-slide ${
              index === currentSlide ? "active" : ""
            }`}
          >
            <img
              src={slide.image}
              alt={slide.sideLabel}
              className="luxury-hero-image"
            />

            <div className="luxury-hero-overlay"></div>
          </div>
        ))}

        <div className="luxury-hero-decoration hero-decoration-one"></div>
        <div className="luxury-hero-decoration hero-decoration-two"></div>

        <div className="luxury-hero-inner">
          <div
            className="luxury-hero-content"
            key={currentSlide}
          >
            <p className="luxury-hero-eyebrow">
              <span></span>
              {heroSlides[currentSlide].eyebrow}
            </p>

            <h1>
              {heroSlides[currentSlide].title}
              <em>
                {heroSlides[currentSlide].highlight}
              </em>
            </h1>

            <p className="luxury-hero-description">
              {heroSlides[currentSlide].description}
            </p>

            <div className="luxury-hero-actions">
              <Link
                to={heroSlides[currentSlide].link}
                className="luxury-primary-button"
              >
                {heroSlides[currentSlide].buttonText}

                <span>
                  <i className="bi bi-arrow-up-right"></i>
                </span>
              </Link>

              <a
                href="#explore"
                className="luxury-secondary-button"
              >
                Discover Vibely
              </a>
            </div>
          </div>

          <div className="luxury-hero-side">
            <div className="hero-side-line"></div>

            <span>CURATED BY VIBELY</span>

            <strong>
              {heroSlides[currentSlide].sideLabel}
            </strong>
          </div>
        </div>

        <div className="luxury-carousel-bottom">
          {/* <div className="carousel-counter">
            <span>
              {String(currentSlide + 1).padStart(2, "0")}
            </span>

            <div className="counter-line">
              <div
                className="counter-progress"
                key={`progress-${currentSlide}`}
              ></div>
            </div>

            <small>
              {String(heroSlides.length).padStart(2, "0")}
            </small>
          </div> */}

          <div className="carousel-dots">
            {heroSlides.map((slide, index) => (
              <button
                type="button"
                key={slide.id}
                aria-label={`Go to slide ${index + 1}`}
                className={
                  index === currentSlide ? "active" : ""
                }
                onClick={() => setCurrentSlide(index)}
              >
                <span></span>
              </button>
            ))}
          </div>

          <div className="carousel-arrows">
            <button
              type="button"
              onClick={previousSlide}
              aria-label="Previous slide"
            >
              <i className="bi bi-arrow-left"></i>
            </button>

            <button
              type="button"
              onClick={nextSlide}
              aria-label="Next slide"
            >
              <i className="bi bi-arrow-right"></i>
            </button>
          </div>
        </div>

        <a href="#explore" className="hero-scroll">
          <span>SCROLL TO DISCOVER</span>

          <div>
            <i className="bi bi-arrow-down"></i>
          </div>
        </a>
      </section>

      

      <section className="home-explore" id="explore">
        <div className="home-section-heading">
          <div>
            <span className="home-section-label">
              EXPLORE VIBELY
            </span>

            <h2>
              One platform.
              <em> Endless experiences.</em>
            </h2>
          </div>

          <p>
            Whatever the mood, wherever the moment takes
            you, discover something worth experiencing.
          </p>
        </div>

        <div className="experience-grid">
          <Link
            to="/events"
            className="experience-card experience-card-large"
          >
            <img src={concertImage} alt="Events" />

            <div className="experience-overlay"></div>

            <div className="experience-number">
              01
            </div>

            <div className="experience-content">
              <span>LIVE · CONNECT · CELEBRATE</span>

              <h3>Events</h3>

              <p>
                Concerts, celebrations and unforgettable
                experiences waiting to be discovered.
              </p>

              <div className="experience-link">
                Explore Events
                <i className="bi bi-arrow-up-right"></i>
              </div>
            </div>
          </Link>

          <Link
            to="/apartments"
            className="experience-card"
          >
            <img src={stayImage} alt="Apartments" />

            <div className="experience-overlay"></div>

            <div className="experience-number">
              02
            </div>

            <div className="experience-content">
              <span>REST · STAY · UNWIND</span>

              <h3>Apartments</h3>

              <p>
                Beautiful spaces designed for comfort,
                privacy and memorable stays.
              </p>

              <div className="experience-link">
                Explore Apartments
                <i className="bi bi-arrow-up-right"></i>
              </div>
            </div>
          </Link>

          <Link
            to="/food"
            className="experience-card"
          >
            <img src={foodImage} alt="Food" />

            <div className="experience-overlay"></div>

            <div className="experience-number">
              03
            </div>

            <div className="experience-content">
              <span>TASTE · ENJOY · SHARE</span>

              <h3>Food</h3>

              <p>
                Delicious meals and flavours that turn
                ordinary moments into something special.
              </p>

              <div className="experience-link">
                Explore Food
                <i className="bi bi-arrow-up-right"></i>
              </div>
            </div>
          </Link>
        </div>
      </section>

      <section className="home-intro">
        <div className="home-intro-left">
          <span className="home-section-label">
            WELCOME TO VIBELY
          </span>

          <h2>
            Life is made of
            <em> beautiful moments.</em>
          </h2>
        </div>

        <div className="home-intro-right">
          <p>
            From the event you cannot stop talking about,
            to the perfect place to stay and the meal that
            completes the moment — Vibely brings beautiful
            experiences together in one place.
          </p>

          <div className="intro-signature">
            <span></span>
            EVENTS · APARTMENTS · FOOD
          </div>
        </div>
      </section>

      {/* <section className="home-featured">
        <div className="home-section-heading featured-heading-new">
          <div>
            <span className="home-section-label">
              CURATED FOR YOU
            </span>

            <h2>
              A little inspiration for
              <em> your next vibe.</em>
            </h2>
          </div>

          <Link to="/events" className="section-text-link">
            View all experiences
            <i className="bi bi-arrow-right"></i>
          </Link>
        </div>

        <div className="luxury-feature-grid">
          <Link
            to="/events"
            className="luxury-feature-card"
          >
            <div className="luxury-feature-image">
              <img
                src={concertImage}
                alt="Live event"
              />

              <span>EVENT</span>
            </div>

            <div className="luxury-feature-body">
              <p className="luxury-feature-location">
                VICTORIA ISLAND · LAGOS
              </p>

              <h3>Lagos Music Festival</h3>

              <p>
                A night of energy, music and moments made
                to stay with you long after the lights go
                down.
              </p>

              <div className="luxury-feature-footer">
                <span>20 DEC</span>

                <strong>
                  From ₦10,000
                  <i className="bi bi-arrow-up-right"></i>
                </strong>
              </div>
            </div>
          </Link>

          <Link
            to="/apartments"
            className="luxury-feature-card feature-raised"
          >
            <div className="luxury-feature-image">
              <img
                src={stayImage}
                alt="Luxury apartment"
              />

              <span>APARTMENT</span>
            </div>

            <div className="luxury-feature-body">
              <p className="luxury-feature-location">
                LEKKI · LAGOS
              </p>

              <h3>A Beautiful Escape</h3>

              <p>
                Slow down in a beautiful space where
                comfort, privacy and effortless style
                come together.
              </p>

              <div className="luxury-feature-footer">
                <span>PER NIGHT</span>

                <strong>
                  From ₦80,000
                  <i className="bi bi-arrow-up-right"></i>
                </strong>
              </div>
            </div>
          </Link>

          <Link
            to="/food"
            className="luxury-feature-card"
          >
            <div className="luxury-feature-image">
              <img
                src={breakfastImage}
                alt="Food experience"
              />

              <span>FOOD</span>
            </div>

            <div className="luxury-feature-body">
              <p className="luxury-feature-location">
                LAGOS · NIGERIA
              </p>

              <h3>A Taste To Remember</h3>

              <p>
                Delicious flavours, beautiful presentation
                and food worth coming back for.
              </p>

              <div className="luxury-feature-footer">
                <span>GOOD FOOD</span>

                <strong>
                  From ₦15,000
                  <i className="bi bi-arrow-up-right"></i>
                </strong>
              </div>
            </div>
          </Link>
        </div>
      </section> */}

      <section className="home-story" id="about">
        <div className="story-visual">
          <div className="story-main-image">
            <img
              src={hotelImage}
              alt="Vibely experience"
            />
          </div>

          <div className="story-small-image">
            <img
              src={foodImage}
              alt="Vibely food experience"
            />
          </div>

          <div className="story-floating-card">
            <img src={vibelyLogo} alt="Vibely" />

            <div>
              <strong>ONE PLATFORM</strong>
              <span>THREE EXPERIENCES</span>
            </div>
          </div>
        </div>

        <div className="story-content">
          <span className="home-section-label">
            WHY VIBELY?
          </span>

          <h2>
            More than booking.
            <em> It's a whole vibe.</em>
          </h2>

          <p className="story-description">
            We believe the best moments should feel
            effortless from the very beginning. Vibely
            brings your events, apartments and food
            experiences together so you can spend less
            time searching and more time living.
          </p>

          <div className="story-benefits">
            <div className="story-benefit">
              <span>01</span>

              <div>
                <h3>Beautifully simple</h3>

                <p>
                  Discover and book your next experience
                  without unnecessary stress.
                </p>
              </div>
            </div>

            <div className="story-benefit">
              <span>02</span>

              <div>
                <h3>Secure booking</h3>

                <p>
                  Book and pay with confidence from one
                  convenient platform.
                </p>
              </div>
            </div>

            <div className="story-benefit">
              <span>03</span>

              <div>
                <h3>Everything together</h3>

                <p>
                  Events, apartments and food — all
                  connected to your Vibely account.
                </p>
              </div>
            </div>
          </div>

          <a href="#explore" className="story-button">
            Start Exploring

            <span>
              <i className="bi bi-arrow-up-right"></i>
            </span>
          </a>
        </div>
      </section>

      <section className="home-manifesto">
        <div className="manifesto-decoration">
          V
        </div>

        <div className="manifesto-inner">
          <span>
            THE VIBELY EXPERIENCE
          </span>

          <h2>
            Don't just make plans.
            <em> Make memories.</em>
          </h2>

          <p>
            Find somewhere to go, somewhere beautiful to
            stay and something delicious to enjoy.
          </p>

          <div className="manifesto-links">
            <Link to="/events">
              Events
              <i className="bi bi-arrow-up-right"></i>
            </Link>

            <Link to="/apartments">
              Apartments
              <i className="bi bi-arrow-up-right"></i>
            </Link>

            <Link to="/food">
              Food
              <i className="bi bi-arrow-up-right"></i>
            </Link>
          </div>
        </div>
      </section>

      <section className="home-newsletter">
        <div className="newsletter-decoration newsletter-circle-one"></div>
        <div className="newsletter-decoration newsletter-circle-two"></div>

        <div className="home-newsletter-inner">
          <div className="newsletter-copy">
            <span className="newsletter-label">
              STAY IN THE LOOP
            </span>

            <h2>
              The best vibes,
              <em> straight to your inbox.</em>
            </h2>

            <p>
              Be the first to discover new events,
              beautiful apartments, food experiences and
              special Vibely updates.
            </p>
          </div>

          <div className="luxury-newsletter-form">
            <div className="newsletter-input-wrap">
              <i className="bi bi-envelope"></i>

              <input
                type="email"
                placeholder="Enter your email address"
              />
            </div>

            <button type="button">
              Join the list

              <i className="bi bi-arrow-right"></i>
            </button>

            <small>
              No noise. Just beautiful experiences worth
              knowing about.
            </small>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
};

export default Home;