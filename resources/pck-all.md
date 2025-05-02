## General understanding: Change/add requirements

- Add or change requirements of program so that adjustments to variables or variable usage have to be made. For example:
- Ask to increase/decrease loop iterations.
- Ask to change boundary checks. E.g. temperature trigger from 20 → 25.
- Change program input requirements.
- Request changes to the work
- Add extra data to process (e.g. add year of birth to already existing first/last name input)
- Change the program a bit. e.g. change the VAT percentage from 20 to 9 percent.
- Add an extra requirement (feature) and observe student making the change.
- change a value
- Asking how this variable can be given a different value. eg: make a small change to the requirement of an exercise.
- Ask student to change the code (e.g. by adding a line)
- Ask student to change values to take the else branch of an if statement
- To change a value of a variable and explain how it affects the program

## Purpose of variable

Ask:
- why is this variable necessary and what is its purpose?
- Ask the purpose of a certain variable.
- what the purpose of the variable is.
Check:
- Does datatype match purpose of variable
- Explain the purpose of this variable

## Datatypes

Ask:
- Why was a certain type chosen and not another.
- Assign number to a string : What happens?
- Why choose a certain datatype: a,b or c?
- explain reasons why a variable has a certain type.
- change the type of a variable.

## Naming

Ask:
- What is the reason for the name of variable(because it must reflect its goal). Is another name an option?
- Ask to explain why a certain name was choosen
- What is the reason for the name of this variable?
- Checking if naming conform to the standard
- asking the reason why a variable is named the way it is.
- Explain the reason for the choice of a name of a variable.

## Values during execution

Ask:
- Mentally run a program and explain the values
- Write out a table for the vars in a for loop.
- Explain value of a variable at a certain point during execution.
- Ask the value and type of a variable of a random spot in a program
- Show/produce variable mutation tables over execution time
- Explain a value of a variable at a certain point in execution
- Ask students to predict the values of a variable at a certain point in execution

## Declaration/initialization

Ask:
- Where is this variable declared?
- Ask students where to assign a value to a variable
- Explain why a variable is declared in the place where it is.
Check:
- Is a declared variable used
- Is a used variable declared
- where did you declare this variable
- where did you assign or re-assign a value to this variable.

## Scoping rules

Ask:
- Move the variable to a different scope : What happens?
- Why is this variable declared here?
- ask if a variable must be global or not.

## Conversion

Ask:
- Explain when type conversion happens
- explain reasons why a certain conversion method was selected.
Check:
- Do they do type conversion correctly.

## Other

- Review & feedback of code quality
- Ask students to explain their work
- Check non-verbal student response
- Change while loop into for
- ask to show if redundant variables can be reduced
- demonstrate by writing a program.
- explain meaning of a statement of a section of the code.
- Ask student to explain the choices behind the code.
- Ask student to explain why there is an equal sign in a condition instead of a comparison sign.

# Learning goals

1. Understand that variables have an associated datatype and being able to choose the appropriate type from an existing set.
2. Understand and know naming conventions and meaningful/descriptive names are chosen.
3. Understand what scope of variables are and how apply scope.
4. What operations can be applied to variables including assignment.
5. Understand what a variable is, what role it plays and that variables contain a value.
6. Understand what the purpose of variables are and that they are used for data storage.
7. Understand what type conversion is and being able to apply type conversion.
8. Understanding and knowing how to pass variables as arguments and that function results can be assigned to variables.
9. Understand what the physical representation of variables in memory are and what the limits of various data types are.
10. Understand how to use and apply variables in context such as conditions.
11. Understand how to declare and initialize variables.

# Topics to exclude for learning goals

1. Understanding or knowing about value and reference semantics
2. How variables are implemented and represented in memory.
3. Any modifiers that can be applied to variables such as const, unsigned, public, etc.
4. What the details of type conversion are and how automatic type conversion works.
5. Implementation details of memory allocation and variable disposal

# Learning difficulties that students have.

1. Student have difficulty with learning datatypes, understanding the differences and size limits between the types and knowing when to choose which type.
2. Student have difficulty understanding what operations can be applied, and understanding operator precedence.
3. Student have difficulty understanding scoping rules, declaring variables in the right scope and understanding name shadowing.
4. Student have difficulty understanding the details of variables related to what happens in memory.
5. Student have difficulty predicting a value at a point in execution.
6. Student have difficulty understanding the abstraction of what a variable is.

# Mistakes students make with variables.

## Datatype mistakes

- Choosing the wrong type.
- Incorrect value/type assignment (mismatching datatypes on the assignment expression)
- Ignoring datatype details. Student use "classes" of types: numbers, string, boolean.
- Choosing the wrong type for a variable
- mistakes with overflow.
- Overflow mistakes
- Mixing strings with other types (string + int)
- Mixing datatypes in an expression. E.g: a / "1" (int div string)
- Choose wrong data type for the purpose of a variable
- String concatenation and type confusion: concatenating incompatible types.
- Choosing a double instead of a float/Choosing a double instead of an int.
- Comparison of float/double with int.
- Incorrect types
- Mixing the wrong datatypes in certain operations (e.g `"8" * 2`)

## Scoping mistakes

- Wrong place of usage. E.g. using a variable outside a loop that is declared inside a loop.
- Name shadowing with two variables. E.g. (Variable with same name in inner and outer scope.
- Accessing a var declared in a different scope
- Variable declared twice in the same scope
- Variable vanuit verkeerde scope aanspreken
- Using only or too many global variables where local variables are sufficient
- Referencing variables from the wrong scope
- Making everything public
- Using global scope instead of function scope
- making everything global
- Name shadowing (global `int a`; local `int a`)
- Making all variables global instead of local when appropriate
- using too many global variables.

## Naming mistakes

- Abbreviated unclear variable names
- Bad naming
- Short naming / math style naming
- Naamgeving: afkortingen. Using math named variables.
- Not following naming conversions
- Ignoring naming conventions
- Choose too short variable names
- Choose misleading or unhelpful names
- Choosing short names. E.g. a,b,c (= non descriptive names)
- Naming: naming a variable according to its contents and not its purpose.
- Not following naming conventions

## Declaration / initialization mistakes

- Missing variable declaration
- Forgetting to initialize a variable
- Relying on default initial values
- relying on default initialization values without realizing it.
- forgetting that a variable is already used and declaring it again in lower scope
- Forgetting to assign a value to new variable (forgetting to initialize)
- Using a variable without declaring or initialization
- Expecting a value without intialization
- Assigning multiple purposes to variables
- Using a variable that isn't declared.

## Conversion mistakes

- implicit vs explicity type conversion in mixed type expressions. (e.g. int & double or int & string)
- Relying on automatic type conversion in a condition (e.g. if (a) → if (a == 1))
- Relying too much on automatic (compiler) behaviour with type conversion. (string + int) vs (int + string)

## Operator mistakes

- confusing = and == operators

## Conditional expression mistakes

- comparing booleans to true or false.
- Mixing integers and booleans (in conditions)
- Wrong or missing condition in the loop condition
- Using the wrong variable in the loop (not part of the condition)
- Off by 1 errors in conditions

## Other mistakes

- Afraid to introduce new variables.
- passing variables to functions but not using it.
- creating a new a variable instead of reassigning a value to an existing variable.
- choosing string in the wrong place.
- Using too many (unnecessary) variables
- Reassigning a new value to the same variable using the same variable on the Right Hand Side (e.g. `a = a + 1`)
# Student variable misconceptions

## Naming misconceptions

- Belief that variable name influences its behaviour
- Belief that arguments passed to functions are the same or must be the same as the parameter name.
- Belief that variable name must be as short as possible
- Thinking that parameter name of a function is associated with the argument name.
- Applying naming conventions from one language in another
- Not knowing that languages are case sensitive

## Datatype misconceptions

- Misunderstanding datatypes (incorrect assignment or wrongly mixed in an expression)
- Misunderstanding differences between similar types.
- Misunderstanding difference between floating point types and integer types
- confusing data types. e.g. string vs int
- Applying untyped language rules to a typed language (e.g. using the var keyword everywhere)
- Thinking that types have no limits
- Confusing boolean with int. E.g. (`digitalWrite(4, led_on)` where `led_on` is boolean

## Scoping misconceptions

- Thinking that a variable with the same name in another scope is the same variable.

## Operations misconceptions

- Confusing assignment and equality operator
- Confusing assignment operator for the comparison (`==`) operator.
- expression order: thinking that assignment is from left to right. E.g:  `a+b = c` the result of `a+b` stored in `c`.
- Assignment operator vs equals operator

## Other misconceptions

- Thinking that variable have large cost impact.
- Computer can guess what to with do with a variable.
- Thinking that variables do not mutate (cause mathematics)
- Thinking that a variable can't be reassigned a new value.
- Thinking that variable availability is limited (resulting in inhibition to creating a new variable)
- not realizing that arrays have a length
## How to teach students to reach the learning goals

## Demos

- Give live demos.
- Give demos
- Give demos
- Joint building of a program/Teacher invites student to suggest idea for a program/Build it together with students instructing teacher what to type/Demonstrate mistakes, explain what is wrong, why it is wrong and then how to fix it.
- I do demos
- Live programming session/I ask students questions such as: "Which type should this variable be?"/let students suggest the next line

## Show examples

- Use examples of good bad naming
- Provide examples
- show examples
- give scoping examples and motivate why a variable is in a certain scope.
- I Give examples

## Explain

- Use the box analogy to explain
- Data storage: program is data in → data out.
- Compare constants (values) and variables
- Refer to mathematics. E.g. variable f(x). x is a var
- Explain strategy to write small isolated programs to test a question/behaviour.
- arguments/parameters: explain buy analogy of shopping list (arguments) and returning home with groceries (return value)
- String: explain as a chain of letters (literally)
- Explain variable-as-a-box analogy
- Explanation (lecture)
- Explain what variables are from a math & physics perspective. E.g. U = I · R and x=2y+3.
- Explain reasons for the existence of different types
- Explain naming rules & best practices
- By using analogies/Box analogy for variables/Bookshelve analogy for arrays/House with specific places for specific types of data/Shampoo in bathroom, Bicycle in garage
- Explain learning objectives first
- Show (partial)steps for an algorithm. E.g. how are two numbers added.
- explain the computational model and the role of variables/explain by a story that relates to real-life concepts/explain types./explain that a programmer has to write all small steps the computer must take/explain as-is with examples & counter examples/explain name be logical (have meaning):
- Make the connection with the real world. E.g. how does a calculator work.
- Cabinet analogy with labeled/numbered drawers
- I give direct explanation with examples.

## Debugging/Visualizing

- use the debugger and show what happens
- Show a table to keep track of value during execution.
- Run through program and show values during execution
- Visualize usage by showing values changes during execution
- show concrete values and examples
- Variable mutation table (shows variable change over time)
- Visualize lifetime by showing creation/destruction & table over time
- Helping with debugging using the debugger/first global information about the debugger/After step-by-step walkthrough and show variable values during execution
- Use debugger to make values of variables visible during execution. Also by using `print` statements.
- Show table with values during execution

## Practice

- Students practice.
- Feedback on assignments
