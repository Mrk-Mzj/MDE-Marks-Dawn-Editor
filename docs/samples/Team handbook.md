# Team handbook

This handbook explains how our small team works: how we plan, how we write things down, how we review each other's work and how we keep meetings short. It is a living document. If something here no longer matches what we do, change the text, not the habit.

## Working hours

We do not count hours. We agree on what we want to finish this week and everyone picks the time of day that suits them. The only fixed point is the **stand-up at 10:00**, fifteen minutes, cameras optional.

If you are away, write it in the shared calendar at least a day before. If you are ill, just send a short message; nobody needs details.

## Planning

Every Monday we look at the board together and choose the work for the week. A task is ready to start when:

- [x] it has a clear title that says what will be different when it is done,
- [x] someone has written down why we want it,
- [x] it is small enough to finish in two or three days,
- [ ] it has an owner (a person, not a team).

Large tasks are split before they enter the week. Splitting is part of the work, not a chore before it.

## Writing things down

Decisions live in writing. A decision made in a call is not made until someone writes two or three sentences about it in the decision log: what we decided, why, and what we chose not to do.

We prefer plain text and Markdown. A short note today beats a long document next month.

### Naming files

| Kind | Pattern | Example |
|---|---|---|
| Meeting notes | `YYYY-MM-DD topic` | 2027-03-14 roadmap |
| Decision | `decision NNN title` | decision 042 new editor |
| Guide | `how to …` | how to release |

## Reviews

Every change is read by one other person before it ships. The reviewer looks for three things, in this order:

1. Does it do what the task says?
2. Is it easy to understand for someone who joins next year?
3. Is there anything that could surprise a user?

Keep comments kind and specific. "This name confused me, maybe `retryCount`?" helps; "bad name" does not.

> A review is a conversation, not an exam. The author and the reviewer share the goal.

## Meetings

Most meetings can be a message. When we do meet:

- the person who calls the meeting writes the agenda in the invitation,
- we start on time and end early when we can,
- someone writes the notes and shares them the same day.

### Retrospective

Once a month we spend an hour on what went well, what did not, and one thing we want to try next month. Only one: changing everything at once changes nothing.

## Releases

We release small changes often. Before each release:

- [x] the change log is up to date,
- [x] the version number is raised,
- [ ] the release notes are read by someone outside the team,
- [ ] the download link works.

If a release goes wrong, we roll back first and investigate second. Nobody is blamed for a failed release; we fix the process that let it through.

## Tools

| Purpose | Tool | Owner |
|---|---|---|
| Notes and docs | Markdown files | everyone |
| Tasks | The board | Anna |
| Chat | Team channel | Tom |
| Calendar | Shared calendar | Ola |

## Onboarding

A new person gets a buddy for the first month. The buddy answers questions, introduces people and reviews the first changes. In the first week the new person should:

1. set up their computer with the help of the guide,
2. read this handbook and fix one thing in it,
3. ship one small change to users.

## Holidays

Tell the team two weeks ahead for longer holidays. Before you leave, hand over anything that cannot wait and switch on an away message. When you are away, be away: nobody expects replies.

## Feedback

Say thank you in public and give criticism in private. Ask for feedback on your own work as often as you give it to others.

# Guides

## How to write a good task

Start the title with a verb and describe the result, not the activity. "Add an export button to the report page" is better than "Export". Anyone who reads the title should know when the task is finished.

In the description, write why the task matters and who asked for it. Add links to the conversation or the document where the idea came from, so nobody has to search for the context later.

If you are not sure how to do something, say so in the description. An honest "I don't know yet how to test this" saves a long discussion in the review.

## How to run a stand-up

The stand-up is for the team, not for a manager. Each person says what they finished, what they are working on and whether anything blocks them. Details go to a separate conversation after the stand-up.

Keep a timer on the screen. When it reaches fifteen minutes, we stop, even in the middle of a sentence. It sounds harsh, but it keeps the meeting useful.

If you cannot join, write your update in the team channel before 10:00. Someone will read it out.

## How to write meeting notes

Notes are not a transcript. Write down decisions, open questions and tasks with owners. Everything else can be left out.

Use the same structure every time:

1. Who was there.
2. What we decided.
3. What we still need to find out.
4. Who does what, and by when.

Share the notes in the team channel on the same day. Notes shared a week later are a history book, not a tool.

## How to ask for help

Ask early. Spending a whole day stuck on something a colleague could explain in five minutes is not independence, it is waste.

When you ask, describe what you are trying to do, what you have tried and what happened. A screenshot or a short piece of text is often worth more than a long explanation.

When someone helps you, write down the answer where others can find it. The next person with the same question will thank you.

## How to give a demo

Show the result, not the code. Prepare the data beforehand, so the demo does not depend on luck. Keep it under ten minutes and leave time for questions.

If something breaks during the demo, say what you expected to happen and move on. Everyone has seen a failed demo; nobody remembers it a week later.

## How to say no

We get more requests than we can handle. Saying no to a request is part of the job, and it is better than saying yes and never doing it.

Explain what we are working on now and why. Offer an alternative when there is one: a smaller version, a later date or another team that can help.

Write down the requests we turn down. When we plan the next month, we look at the list again; some of them will be worth doing then.

## How to work with documents

Keep one document for one topic. When a document grows too long, split it and link the parts together.

Put the date and the author at the top. Readers want to know whether the text is fresh and whom to ask about it.

When a document is out of date, either update it or mark it clearly as old. An outdated document that looks current is worse than no document at all.

### Checklist for a new document

- [x] A title that says what the document is about
- [x] The date and the author
- [x] A short summary in the first paragraph
- [ ] Links to related documents
- [ ] A note on who should review it

## How to plan a holiday handover

Two weeks before you leave, list the things that cannot wait until you come back. For each of them, find a person who can take it over and walk them through it.

Write the handover in a short document: what is going on, where the files are, whom to contact. Put the link in your away message.

On your last day, check that nothing is waiting for your answer. Then switch off the notifications and enjoy the time off.

## Frequently asked questions

**Can I work from another city for a few weeks?**
Yes, as long as you can join the stand-up and your internet connection is good enough for calls.

**Do I have to use the same tools as everyone else?**
For shared work, yes: the board, the calendar and the team channel. For your own notes, use whatever helps you.

**What if I disagree with a decision?**
Say it, with your reasons, in the decision log or at the next planning. If the team still decides otherwise, we try it and look at the results together.

**How do I suggest a change to this handbook?**
Edit it and ask someone for a review, like any other change.

# Appendix

## Glossary

- **Board** – the list of tasks for the current and next weeks.
- **Owner** – the one person responsible for finishing a task.
- **Decision log** – the file where we record decisions and their reasons.

## Changes to this handbook

| Date | Change | Author |
|---|---|---|
| 2027-01-10 | First version | Anna |
| 2027-02-02 | Added reviews | Tom |
| 2027-03-14 | Added releases and holidays | Ola |
