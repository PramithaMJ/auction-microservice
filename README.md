# AuctionHub Website - Microservice

[![CI Pipeline](https://github.com/PramithaMJ/auction-microservice/actions/workflows/ci.yml/badge.svg)](https://github.com/PramithaMJ/auction-microservice/actions/workflows/ci.yml)

[![Production CI Pipeline](https://github.com/PramithaMJ/auction-microservice/actions/workflows/production-ci.yml/badge.svg)](https://github.com/PramithaMJ/auction-microservice/actions/workflows/production-ci.yml)

This repository contains a full-featured auction platform built with a microservices architecture. It leverages Docker for containerization and Kubernetes for orchestration, supporting local development and production deployments.


## Contributors


| Student ID   | Name                  | GitHub Profile                                                                                                         |
| ------------ | --------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| EG/2020/3990 | Jayasooriya L.P.M.    | [![GitHub](https://img.shields.io/badge/GitHub-Profile-blue?style=flat&logo=github)](https://github.com/PramithaMJ)    |
| EG/2020/3994 | Jayathilake H.A.C.P.  | [![GitHub](https://img.shields.io/badge/GitHub-Profile-blue?style=flat&logo=github)](https://github.com/chandulaj) |
| EG/2020/3996 | Jayawardhana M.V.T.I. | [![GitHub](https://img.shields.io/badge/GitHub-Profile-blue?style=flat&logo=github)](https://github.com/TheTharz) |
| EG/2020/4040 | Lakpahana A.G.S.      | [![GitHub](https://img.shields.io/badge/GitHub-Profile-blue?style=flat&logo=github)](https://github.com/lakpahana) |


Configuration

### Environment Variables

Key configuration files:

- **Kubernetes**: `k8s/configmaps/auction-configmap.yaml`
- **Docker Compose**: `.env` files in service directories
- **Secrets**: `k8s/secrets/auction-secrets.yaml`

### Required External Services

- **AWS S3** - File storage (optional, falls back to local storage)
- **Stripe** - Payment processing (test keys included)
- **Email Service** - SMTP configuration for notifications


This application consists of **10 microservices** deployed on Kubernetes, implementing advanced patterns like CQRS, Saga, Circuit Breaker, and Event-Driven Architecture.

### Core Services


| Service                                           | Port | Responsibility                                     |
| ------------------------------------------------- | ---- | -------------------------------------------------- |
| **[API Gateway](services/api-gateway/README.md)** | 3001 | Single entry point, request routing, CORS handling |
| **Auth**                                          | 3101 | User authentication and authorization              |
| **Bid**                                           | 3102 | Bid placement and management                       |
| **Listings**                                      | 3103 | Auction listings management                        |
| **Payments**                                      | 3104 | Payment processing via Stripe                      |
| **Profile**                                       | 3105 | User profile management                            |
| **Email**                                         | 3106 | Email notifications                                |
| **Expiration**                                    | 3107 | Time-based operations (auction deadlines)          |
| **Saga Orchestrator**                             | 3108 | Distributed transaction management                 |
| **Frontend**                                      | 3000 | React-based user interface                         |

## Infrastructure Components

- **5 MySQL Database instances** - One per domain service
- **NATS Streaming** - Event-driven communication
- **Redis** - Caching and session storage
- **Jaeger** - Distributed tracing
- **NGINX Ingress** - Load balancing and SSL termination

## **Required configurations:**

- Database passwords and connection strings
- JWT secret key
- Stripe API keys (test keys included)
- AWS S3 credentials (optional)
- SMTP email configuration

### External Service Dependencies

- **AWS S3** - File storage for profile images (falls back to local storage)
- **Stripe** - Payment processing (test keys provided)
- **Email Service** - SMTP configuration for notifications

## Architecture Patterns

### Implemented Patterns

- **Microservices Architecture** - Domain-driven service decomposition
- **API Gateway Pattern** - Single entry point for client requests
- **Database per Service** - Isolated data stores
- **Event-Driven Architecture** - Asynchronous communication via NATS
- **Saga Pattern** - Distributed transaction management
- **CQRS** - Command Query Responsibility Segregation
- **Circuit Breaker** - Fault tolerance and resilience
- **Bulkhead** - Resource isolation

### Communication

- **Synchronous**: REST APIs for direct queries
- **Asynchronous**: Event streaming for state propagation
- **Message Broker**: NATS Streaming Server

## Documentation

### Deployment Guides

- **[Kubernetes Deployment Guide](k8s/README.md)** - Complete K8s deployment instructions
- **[Quick Start Guide](k8s/QUICK-START.md)** - Fast deployment reference
- **[Complete Setup Guide](docs/COMPLETE-SETUP-GUIDE.md)** - Comprehensive setup instructions

### Technical Documentation

- **[Circuit Breaker Guide](docs/CIRCUIT-BREAKER-COMPLETE-GUIDE.md)** - Resilience patterns
- **[User Registration Saga](docs/USER-REGISTRATION-SAGA-GUIDE.md)** - Distributed transactions
- **[AWS Secrets Manager](aws-secrets-manager/README.md)** - Secret management
